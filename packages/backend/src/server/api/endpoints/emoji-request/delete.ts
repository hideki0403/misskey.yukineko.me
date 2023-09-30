/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiRequestsRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { RoleService } from '@/core/RoleService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['emoji-request'],

	requireCredential: true,
	requireRolePolicy: 'canRequestCustomEmojis',

	errors: {
		noSuchEmoji: {
			message: 'No such emoji.',
			code: 'NO_SUCH_EMOJI',
			id: 'b75b5c1b-fe03-4260-9dc3-c11d1943c112',
		},

		accessDenied: {
			message: 'Access denied.',
			code: 'ACCESS_DENIED',
			id: '8b741b3e-2c22-44b3-a15f-29949aa1601e',
		},

		cantDelete: {
			message: 'You can\'t delete this emoji.',
			code: 'CAN_NOT_DELETE_EMOJI',
			id: 'afbd89a8-25a1-4a76-83aa-078d476abf55',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		emojiId: { type: 'string', format: 'misskey:id' },
	},
	required: ['emojiId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.emojiRequestsRepository)
		private emojiRequestsRepository: EmojiRequestsRepository,

		private roleService: RoleService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emoji = await this.emojiRequestsRepository.findOneBy({ id: ps.emojiId });
			const isModerator = await this.roleService.isModerator(me);

			if (emoji == null) {
				throw new ApiError(meta.errors.noSuchEmoji);
			}

			if (emoji.userId !== me.id && !isModerator) {
				throw new ApiError(meta.errors.accessDenied);
			}

			if (emoji.status !== 'pending' && !isModerator) {
				throw new ApiError(meta.errors.cantDelete);
			}

			await this.emojiRequestsRepository.delete(emoji.id);
		});
	}
}
