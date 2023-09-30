/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiRequestsRepository, MiEmoji } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { CustomEmojiService } from '@/core/CustomEmojiService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRolePolicy: 'canManageCustomEmojis',

	errors: {
		noSuchEmoji: {
			message: 'No such emoji.',
			code: 'NO_SUCH_EMOJI',
			id: 'b75b5c1b-fe03-4260-9dc3-c11d1943c112',
		},

		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'fc46b5a4-6b92-4c33-ac66-b806659bb5cf',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		ids: { type: 'array', items: { type: 'string', format: 'misskey:id' } },
		status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
	},
	required: ['ids', 'status'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.emojiRequestsRepository)
		private emojiRequestsRepository: EmojiRequestsRepository,

		private customEmojiService: CustomEmojiService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emojis = await this.emojiRequestsRepository.find({
				where: { id: In(ps.ids) },
				relations: ['image'],
			});

			for (const emoji of emojis) {
				let result: MiEmoji | null = null;

				if (ps.status === 'accepted' && !emoji.importedEmojiId && emoji.image != null) {
					try {
						result = await this.customEmojiService.copy({
							name: emoji.name,
							originalUrl: emoji.image.url,
							category: emoji.category,
							aliases: emoji.aliases,
							license: emoji.license,
							isSensitive: emoji.isSensitive,
							localOnly: emoji.localOnly,
						});
					} catch (e) {
						throw new ApiError();
					}
				}

				await this.emojiRequestsRepository.update(emoji.id, {
					updatedAt: new Date(),
					status: ps.status,
					importedEmojiId: result?.id ?? emoji.importedEmojiId,
					importedEmoji: result ?? emoji.importedEmoji,
				});
			}
		});
	}
}
