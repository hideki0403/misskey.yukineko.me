/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiRequestsRepository, MiEmoji } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { EmojiRequestEntityService } from '@/core/entities/EmojiRequestEntityService.js';
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
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		id: { type: 'string', format: 'misskey:id' },
		name: { type: 'string', pattern: '^[a-zA-Z0-9_]+$' },
		category: {
			type: 'string',
			nullable: true,
			description: 'Use `null` to reset the category.',
		},
		aliases: {
			type: 'array', items: {
				type: 'string',
			},
		},
		license: { type: 'string', nullable: true },
		isSensitive: { type: 'boolean' },
		localOnly: { type: 'boolean' },
		commentByAdmin: { type: 'string', nullable: true },
		status: { type: 'string', enum: ['pending', 'accepted', 'rejected'] },
	},
	required: ['id', 'name', 'fileId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.emojiRequestsRepository)
		private emojiRequestsRepository: EmojiRequestsRepository,

		private emojiRequestEntityService: EmojiRequestEntityService,
		private customEmojiService: CustomEmojiService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emoji = await this.emojiRequestsRepository.findOne({
				where: { id: ps.id },
				relations: ['image'],
			});

			if (emoji == null) {
				throw new ApiError(meta.errors.noSuchEmoji);
			}

			let result: MiEmoji | null = null;

			if (ps.status === 'accepted' && !emoji.importedEmojiId && emoji.image != null) {
				try {
					result = await this.customEmojiService.copy({
						name: ps.name,
						originalUrl: emoji.image.url,
						category: ps.category,
						aliases: ps.aliases,
						license: ps.license,
						isSensitive: ps.isSensitive,
						localOnly: ps.localOnly,
					});
				} catch (e) {
					throw new ApiError();
				}
			}

			await this.emojiRequestsRepository.update(ps.id, {
				updatedAt: new Date(),
				name: ps.name,
				category: ps.category,
				aliases: ps.aliases,
				license: ps.license,
				isSensitive: ps.isSensitive,
				localOnly: ps.localOnly,
				status: ps.status,
				commentByAdmin: ps.commentByAdmin,
				importedEmojiId: result?.id ?? emoji.importedEmojiId,
				importedEmoji: result ?? emoji.importedEmoji,
			});

			const updatedEmoji = await this.emojiRequestsRepository.findOneByOrFail({ id: ps.id, userId: me.id });
			return this.emojiRequestEntityService.pack(updatedEmoji);
		});
	}
}
