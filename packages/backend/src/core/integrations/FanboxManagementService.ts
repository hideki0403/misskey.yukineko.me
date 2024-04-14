import { Injectable, Inject } from '@nestjs/common';
import { Not } from 'typeorm';
import Redis from 'ioredis';
import { MetaService } from '@/core/MetaService.js';
import type { UserProfilesRepository, MiUser } from '@/models/_.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';
import { StatusError } from '@/misc/status-error.js';
import { DI } from '@/di-symbols.js';
import type Logger from '@/logger.js';
import { LoggerService } from '@/core/LoggerService.js';
import { GlobalEventService, GlobalEvents } from '@/core/GlobalEventService.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { bindThis } from '@/decorators.js';
import type { OnApplicationShutdown } from '@nestjs/common';

type SupporterUser = {
	username: string,
	name: string,
	avatarUrl: string,
}

type FanboxMember = {
	amounts: number,
	hide: boolean,
	user: SupporterUser,
}

export type FanboxMembers = Map<string, FanboxMember>;

@Injectable()
export class FanboxManagementService implements OnApplicationShutdown {
	private cache: FanboxMembers = new Map();
	private logger: Logger;
	private cacheLastUpdate = 0;

	constructor(
		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		private metaService: MetaService,
		private httpRequestService: HttpRequestService,
		private loggerService: LoggerService,
		private globalEventService: GlobalEventService,
		private userEntityService: UserEntityService,
	) {
		this.logger = this.loggerService.getLogger('fanbox-manager');
		this.redisForSub.on('message', this.onMessage);
	}

	@bindThis
	private async onMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);

		if (obj.channel === 'internal') {
			const { type, body } = obj.message as GlobalEvents['internal']['payload'];

			switch (type) {
				case 'fanboxMembersUpdated': {
					this.cache = new Map(Object.entries(body));
					this.cacheLastUpdate = Date.now();
					break;
				}

				case 'fanboxMembersUpdating': {
					this.cacheLastUpdate = Date.now();
					break;
				}

				default: break;
			}
		}
	}

	@bindThis
	public amountsValue(user: MiUser): number {
		const target = this.cache.get(user.id);
		return target?.amounts ?? 0;
	}

	@bindThis
	public get() {
		return this.cache;
	}

	@bindThis
	public async update() {
		// 最後に更新してから5分経過していなければ更新しない
		if (Date.now() - this.cacheLastUpdate < 1000 * 60 * 5) return;

		// 排他的に更新したいのでイベントを発行
		this.globalEventService.publishInternalEvent('fanboxMembersUpdating');

		const meta = await this.metaService.fetch();
		if (!meta.enableFanboxIntegration) return;

		const usersList: FanboxMembers = new Map();

		try {
			const members = await this.fetchUsers();
			const users = await this.userProfilesRepository.find({
				where: {
					integrations: Not('{}'),
				},
				relations: {
					user: {
						avatar: true,
					},
				},
			});

			for (const userProfile of users) {
				const pixivId = userProfile.integrations.fanbox?.id;
				const amounts = pixivId ? members[pixivId] : null;
				if (!amounts || !userProfile.user) continue;
				const user = userProfile.user;

				usersList.set(user.id, {
					amounts,
					hide: userProfile.hideFromSupporterPage,
					user: {
						username: user.username,
						name: user.name ?? user.username,
						avatarUrl: user.avatar?.url ?? this.userEntityService.getIdenticonUrl(user),
					},
				});
			}

			this.logger.info(`Found ${usersList.size} fanbox supporter(s)`);
			this.logger.info('Cache updated.');
		} catch (err: any) {
			this.logger.error('Failed to update fanbox supporter cache');
			this.logger.error(err);
		}

		this.globalEventService.publishInternalEvent('fanboxMembersUpdated', Object.fromEntries(usersList));
	}

	@bindThis
	private async fetchUsers(): Promise<Record<string, number>> {
		this.logger.debug('Getting fanbox supporters from api');

		const plans = (await this.request('plan'))?.body;
		const members = (await this.request('relationship'))?.body;

		if (!plans || !members) throw new Error('Failed to fetch fanbox supporters');

		const plansMap = {} as Record<string, number>;
		for (const plan of plans) {
			plansMap[plan.id] = plan.fee;
		}

		const membershipUsers = {} as Record<string, number>;
		for (const member of members) {
			membershipUsers[member.user.userId] = plansMap[member.planId];
		}

		return membershipUsers;
	}

	@bindThis
	private async request(url: string, retry = 0): Promise<any> {
		if (retry >= 2) return {};
		const meta = await this.metaService.fetch(true);

		return await this.httpRequestService.send(encodeURI(`${meta.fanboxApiBackendUrl}/api/${url}`), {
			method: 'GET',
			headers: {
				Accept: 'application/json, */*',
			},
			timeout: 30000,
			size: 1024 * 256,
		}).then(res => res.json()).catch(async err => {
			if (!(err instanceof StatusError)) {
				this.logger.error(err);
				return {};
			}
			if (err.statusCode !== 401) return {};
			return await this.request(url, retry + 1);
		});
	}

	async onApplicationShutdown(): Promise<void> {
		this.redisForSub.off('message', this.onMessage);
	}
}
