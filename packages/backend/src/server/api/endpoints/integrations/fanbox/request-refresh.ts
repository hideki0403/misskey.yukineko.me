import ms from 'ms';
import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { FanboxManagementService } from '@/core/integrations/FanboxManagementService.js';

export const meta = {
	requireCredential: true,
	kind: 'read:integrations',
	secure: true,
	limit: {
		duration: ms('1hour'),
		max: 12,
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		private fanboxManagementService: FanboxManagementService,
	) {
		super(meta, paramDef, async (ps, me) => {
			this.fanboxManagementService.update();
		});
	}
}
