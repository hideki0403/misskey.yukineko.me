/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DriveFilesRepository, EmojiRequestsRepository } from '@/models/_.js';
import { IdService } from '@/core/IdService.js';
import { DI } from '@/di-symbols.js';
import { EmojiRequestEntityService } from '@/core/entities/EmojiRequestEntityService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['emoji-request'],

	requireCredential: true,
	requireRolePolicy: 'canRequestCustomEmojis',

	errors: {
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
		name: { type: 'string', pattern: '^[a-zA-Z0-9_]+$' },
		fileId: { type: 'string', format: 'misskey:id' },
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
		comment: { type: 'string', nullable: true },
	},
	required: ['name', 'fileId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.emojiRequestsRepository)
		private emojiRequestsRepository: EmojiRequestsRepository,

		private emojiRequestEntityService: EmojiRequestEntityService,
		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const driveFile = await this.driveFilesRepository.findOneBy({ id: ps.fileId, userId: me.id });
			if (driveFile == null) throw new ApiError(meta.errors.noSuchFile);

			const emoji = await this.emojiRequestsRepository.insert({
				id: this.idService.genId(),
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: me.id,
				user: me,
				name: ps.name,
				image: driveFile,
				category: ps.category,
				aliases: ps.aliases,
				license: ps.license,
				isSensitive: ps.isSensitive,
				localOnly: ps.localOnly,
				status: 'pending',
				comment: ps.comment,
			}).then(x => this.emojiRequestsRepository.findOneOrFail({
				where: x.identifiers[0],
				relations: ['user', 'image'],
			}));

			return this.emojiRequestEntityService.pack(emoji);
		});
	}
}
