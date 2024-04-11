import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { PatreonManagementService } from '@/core/integrations/PatreonManagementService.js';
import { FanboxManagementService } from '@/core/integrations/FanboxManagementService.js';
import { MetaService } from '@/core/MetaService.js';

export const meta = {
	requireCredential: false,
	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

type SupporterUser = {
	username: string,
	name: string,
	avatarUrl: string,
	withIcon: boolean,
}

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private patreonManagementService: PatreonManagementService,
		private fanboxManagementService: FanboxManagementService,
		private metaService: MetaService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const patreons = this.patreonManagementService.get();
			const supporters = this.fanboxManagementService.get();
			const users: Map<string, SupporterUser> = new Map();
			const meta = await this.metaService.fetch();

			if (!meta.enableSupporterPage || !meta.supporterNameThreshold || !meta.supporterNameWithIconThreshold) return [];

			for (const patreon of patreons.values()) {
				if (patreon.amounts < meta.supporterNameThreshold || patreon.hide) continue;
				const user = patreon.user;
				users.set(user.username, {
					...patreon.user,
					withIcon: meta.supporterNameWithIconThreshold <= patreon.amounts
				});
			}

			for (const supporter of supporters.values()) {
				if (supporter.amounts < meta.supporterNameThreshold || supporter.hide) continue;
				const user = supporter.user;
				users.set(user.username, {
					...supporter.user,
					withIcon: meta.supporterNameWithIconThreshold <= supporter.amounts,
				});
			}

			return Array.from(users.values());
		});
	}
}
