/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojiRequestsRepository } from '@/models/_.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';
import { EmojiRequestEntityService } from '@/core/entities/EmojiRequestEntityService.js';
import { sqlLikeEscape } from '@/misc/sql-like-escape.js';

export const meta = {
	tags: ['emoji-request'],

	requireCredential: true,
	requireRolePolicy: 'canRequestCustomEmojis',

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
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
		sinceId: { type: 'string', format: 'misskey:id' },
		untilId: { type: 'string', format: 'misskey:id' },
		status: { type: 'string', enum: ['pending', 'accepted', 'rejected', 'all'], default: 'all' },
		sort: { type: 'string', enum: ['+createdAt', '-createdAt', '+updatedAt', '-updatedAt'] },
		query: { type: 'string', nullable: true, default: null },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.emojiRequestsRepository)
		private emojiRequestsRepository: EmojiRequestsRepository,

		private emojiRequestEntityService: EmojiRequestEntityService,
		private queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const query = this.queryService.makePaginationQuery(this.emojiRequestsRepository.createQueryBuilder('emoji'), ps.sinceId, ps.untilId)
				.andWhere('emoji.userId = :meId', { meId: me.id })
				.leftJoinAndSelect('emoji.user', 'user')
				.leftJoinAndSelect('emoji.image', 'image');

			if (ps.query) {
				query.andWhere('emoji.name ILIKE :q', { q: `%${sqlLikeEscape(ps.query)}%` });
			}

			if (ps.status !== 'all') {
				query.andWhere('emoji.status = :status', { status: ps.status });
			}

			switch (ps.sort) {
				case '+createdAt': query.orderBy('emoji.createdAt', 'DESC'); break;
				case '-createdAt': query.orderBy('emoji.createdAt', 'ASC'); break;
				case '+updatedAt': query.orderBy('emoji.updatedAt', 'DESC'); break;
				case '-updatedAt': query.orderBy('emoji.updatedAt', 'ASC'); break;
				default: query.orderBy('emoji.id', 'DESC'); break;
			}

			const emojis = await query.limit(ps.limit).getMany();
			return await this.emojiRequestEntityService.packMany(emojis);
		});
	}
}
