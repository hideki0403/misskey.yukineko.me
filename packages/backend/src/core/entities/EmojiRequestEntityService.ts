/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DI } from '@/di-symbols.js';
import type { EmojiRequestsRepository } from '@/models/_.js';
import type { Packed } from '@/misc/json-schema.js';
import type { MiEmojiRequest } from '@/models/EmojiRequest.js';
import { bindThis } from '@/decorators.js';
import { UserEntityService } from './UserEntityService.js';
import { DriveFileEntityService } from './DriveFileEntityService.js';

@Injectable()
export class EmojiRequestEntityService {
	constructor(
		@Inject(DI.emojiRequestsRepository)
		private emojiRequestsRepository: EmojiRequestsRepository,

		private userEntityService: UserEntityService,
		private driveFileEntityService: DriveFileEntityService,
	) {
	}

	@bindThis
	public async pack(
		src: MiEmojiRequest['id'] | MiEmojiRequest,
	): Promise<Packed<'EmojiRequest'>> {
		const emoji = typeof src === 'object' ? src : await this.emojiRequestsRepository.findOneOrFail({
			where: {
				id: src,
			},
			relations: ['user', 'image'],
		});

		return {
			id: emoji.id,
			createdAt: emoji.createdAt.toISOString(),
			user: emoji.user ? await this.userEntityService.pack(emoji.user) : null,
			image: emoji.image ? await this.driveFileEntityService.pack(emoji.image) : null,
			name: emoji.name,
			category: emoji.category,
			aliases: emoji.aliases,
			license: emoji.license,
			isSensitive: emoji.isSensitive,
			localOnly: emoji.localOnly,
			status: emoji.status,
			comment: emoji.comment,
			commentByAdmin: emoji.commentByAdmin,
		};
	}

	@bindThis
	public packMany(
		emojis: any[],
	) {
		return Promise.all(emojis.map(x => this.pack(x)));
	}
}

