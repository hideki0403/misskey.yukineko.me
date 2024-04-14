import { Injectable, Inject } from '@nestjs/common';
import { Not } from 'typeorm';
import Redis from 'ioredis';
import { OAuth2 } from 'oauth';
import { MetaService } from '@/core/MetaService.js';
import type { UserProfilesRepository, MiUser, RoleAssignmentsRepository } from '@/models/_.js';
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

type PatreonMember = {
	amounts: number,
	hide: boolean,
	isPatreon: boolean,
	user: SupporterUser,
}

export type PatreonMembers = Map<string, PatreonMember>;

@Injectable()
export class PatreonManagementService implements OnApplicationShutdown {
	private cache: PatreonMembers = new Map();
	private logger: Logger;
	private cacheLastUpdate = 0;

	constructor(
		@Inject(DI.redisForSub)
		private redisForSub: Redis.Redis,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.roleAssignmentsRepository)
		private roleAssignmentsRepository: RoleAssignmentsRepository,

		private metaService: MetaService,
		private httpRequestService: HttpRequestService,
		private loggerService: LoggerService,
		private globalEventService: GlobalEventService,
		private userEntityService: UserEntityService,
	) {
		this.logger = this.loggerService.getLogger('patreon-manager');
		this.redisForSub.on('message', this.onMessage);
	}

	@bindThis
	private async onMessage(_: string, data: string): Promise<void> {
		const obj = JSON.parse(data);

		if (obj.channel === 'internal') {
			const { type, body } = obj.message as GlobalEvents['internal']['payload'];

			switch (type) {
				case 'patreonMembersUpdated': {
					this.cache = new Map(Object.entries(body));
					this.cacheLastUpdate = Date.now();
					break;
				}

				case 'patreonMembersUpdating': {
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
		if (!target) return 0;

		return target.isPatreon ? target.amounts : 0;
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
		this.globalEventService.publishInternalEvent('patreonMembersUpdating');

		const meta = await this.metaService.fetch();
		if (!meta.enablePatreonIntegration) return;

		const usersList: PatreonMembers = new Map();

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
				const patreonId = userProfile.integrations.patreon?.id;
				const amounts = patreonId ? members[patreonId] : null;
				if (!amounts || !userProfile.user) continue;
				const user = userProfile.user;

				usersList.set(user.id, {
					amounts,
					isPatreon: true,
					hide: userProfile.hideFromSupporterPage,
					user: {
						username: user.username,
						name: user.name ?? user.username,
						avatarUrl: user.avatar?.url ?? this.userEntityService.getIdenticonUrl(user),
					},
				});
			}

			this.logger.info(`Found ${usersList.size} patreon(s)`);
		} catch (err: any) {
			this.logger.error('Failed to fetch patreon users');
			this.logger.error(err);
		}

		// 支援者ロールに該当するユーザーも追加
		for (const role of meta.supporterRoles) {
			const roleId = role.split(',')[0].trim();
			const roleAmounts = Number(role.split(',')[1]);

			const targets = await this.roleAssignmentsRepository.find({
				where: { roleId },
				relations: {
					user: {
						avatar: true,
					},
				},
			});

			targets.forEach(async assign => {
				const user = assign.user as MiUser;
				const userProfile = await this.userProfilesRepository.findOneBy({ userId: user.id });

				usersList.set(user.id, {
					amounts: isNaN(roleAmounts) ? 500 : roleAmounts,
					isPatreon: false,
					hide: userProfile?.hideFromSupporterPage ?? false,
					user: {
						username: user.username,
						name: user.name ?? user.username,
						avatarUrl: user.avatar?.url ?? this.userEntityService.getIdenticonUrl(user),
					},
				});
			});
		}

		this.globalEventService.publishInternalEvent('patreonMembersUpdated', Object.fromEntries(usersList));
	}

	@bindThis
	private async fetchUsers(): Promise<Record<string, number>> {
		this.logger.debug('Getting patreons from api');

		const campaign = await this.request('/campaigns');
		const campaignId = campaign.data?.[0]?.id;
		if (!campaignId) return {};

		const requestFormat = `/campaigns/${campaignId}/members?include=currently_entitled_tiers,user&fields[member]=email,currently_entitled_amount_cents`;
		let responseData: any[] = [];
		let cursor: null | string = null;

		while (true) {
			const response = await this.request(requestFormat + (cursor ? `&page[cursor]=${cursor}` : ''));

			// レスポンスにdataプロパティが存在しなければ中断
			if (!response.data) break;

			// レスポンスを結合
			responseData = responseData.concat(response.data);

			// もしページネーションのカーソルでnextが存在すればcursorとして定義する
			if (response.meta?.pagination?.cursors?.next) {
				cursor = response.meta.pagination.cursors.next as string;
			} else {
				// カーソルが存在しなければそれ以上はAPIを掘る必要はないので終了
				break;
			}
		}

		if (!Object.keys(responseData).length) return {};

		const membershipUsers = {} as Record<string, number>;
		for (const user of responseData) {
			if (!user.attributes.currently_entitled_amount_cents || !user.attributes.email) continue;
			membershipUsers[user.attributes.email] = user.attributes.currently_entitled_amount_cents;
		}

		return membershipUsers;
	}

	@bindThis
	private async request(url: string, retry = 0): Promise<any> {
		if (retry >= 2) return {};
		const meta = await this.metaService.fetch(true);

		return await this.httpRequestService.getJson(encodeURI(`https://www.patreon.com/api/oauth2/v2${url}`), '*/*', {
			'Authorization': `Bearer ${meta.patreonAccessToken}`,
		}).then(res => res).catch(async err => {
			if (!(err instanceof StatusError)) {
				this.logger.error(err);
				return {};
			}
			if (err.statusCode !== 401) return {};

			// tokenが古くなっている場合はリフレッシュする
			await this.tokenRefresh(meta.patreonClientId as string, meta.patreonClientSecret as string, meta.patreonRefreshToken as string);
			return await this.request(url, retry + 1);
		});
	}

	@bindThis
	private async tokenRefresh(clientId: string, clientSecret: string, refreshToken: string): Promise<void> {
		const oauth = new OAuth2(
			clientId,
			clientSecret,
			'https://www.patreon.com/',
			'oauth2/authorize',
			'api/oauth2/token',
		);

		const result = await new Promise<any>((resolve, reject) => {
			oauth.getOAuthAccessToken(refreshToken, { grant_type: 'refresh_token' }, (err, accessToken, refreshToken, result) => {
				if (err) return reject(err);
				if (result.error) return reject(result.error);

				return resolve({
					accessToken,
					refreshToken,
					expiresDate: Date.now() + Number(result.expires_in) * 1000,
				});
			});
		}).catch(err => {
			this.logger.error(JSON.stringify(err, null, '    '));
			return null;
		});

		if (!result) {
			this.logger.error('Failed to refresh access token');
			return;
		}

		await this.metaService.update({
			patreonAccessToken: result.accessToken,
			patreonRefreshToken: result.refreshToken,
		});

		this.logger.info('Access token is refreshed');

		return;
	}

	async onApplicationShutdown(): Promise<void> {
		this.redisForSub.off('message', this.onMessage);
	}
}
