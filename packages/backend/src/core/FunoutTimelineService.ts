/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { DI } from '@/di-symbols.js';
import { bindThis } from '@/decorators.js';
import { IdService } from '@/core/IdService.js';
import type { Packed } from '@/misc/json-schema.js';

type RedisNote = {
	id: string;
	userId: string;
	renoteUserId: string;
	replyUserId: string;
	isNotQuote: boolean;
	isReplyToFollowers: boolean;
	isSensitive: boolean;
	visibility: string;
	visibleUserIds: string[];
};

@Injectable()
export class FunoutTimelineService {
	constructor(
		@Inject(DI.redisForTimelines)
		private redisForTimelines: Redis.Redis,

		private idService: IdService,
	) {
	}

	@bindThis
	public push(tl: string, note: Packed<'Note'>, maxlen: number, pipeline: Redis.ChainableCommander) {
		const id = note.id;
		const item = [
			id, // NoteID
			note.userId, // UserID
			note.renote?.userId ?? null, // RenoteUserID
			note.reply?.userId ?? null, // ReplyUserID
			!note.text && !note.fileIds?.length && !note.poll, // isNotQuote
			note.reply?.visibility === 'followers', // isReplyToFollowers
			note.channel?.isSensitive ?? false, // isSensitive
			note.visibility, // visibility
			note.visibleUserIds?.join(',') ?? null, // visibleUserIds
		].join(':');

		// リモートから遅れて届いた(もしくは後から追加された)投稿日時が古い投稿が追加されるとページネーション時に問題を引き起こすため、
		// 3分以内に投稿されたものでない場合、Redisにある最古のIDより新しい場合のみ追加する
		if (this.idService.parse(id).date.getTime() > Date.now() - 1000 * 60 * 3) {
			pipeline.lpush('list:' + tl, item);
			if (Math.random() < 0.1) { // 10%の確率でトリム
				pipeline.ltrim('list:' + tl, 0, maxlen - 1);
			}
		} else {
			// 末尾のIDを取得
			this.redisForTimelines.lindex('list:' + tl, -1).then(lastId => {
				if (lastId == null || (this.idService.parse(id).date.getTime() > this.idService.parse(lastId).date.getTime())) {
					this.redisForTimelines.lpush('list:' + tl, item);
				} else {
					Promise.resolve();
				}
			});
		}
	}

	@bindThis
	public async get(name: string, untilId?: string | null, sinceId?: string | null) {
		const timeline = await this.redisForTimelines.lrange('list:' + name, 0, -1);
		return this.filter(timeline, untilId, sinceId);
	}

	@bindThis
	public async getMulti(name: string[], untilId?: string | null, sinceId?: string | null) {
		const pipeline = this.redisForTimelines.pipeline();
		for (const n of name) {
			pipeline.lrange('list:' + n, 0, -1);
		}

		const res = await pipeline.exec();
		if (res == null) return [];

		const tls = res.map(r => r[1] as string[]);
		let notes: RedisNote[] = [];

		tls.forEach(tl => {
			notes.push(...this.filter(tl, untilId, sinceId));
		});

		notes = Array.from(new Map(notes.map(note => [note.id, note])).values());
		notes.sort((a, b) => a.id > b.id ? -1 : 1);

		return notes;
	}

	@bindThis
	private filter(notes: string[], untilId?: string | null, sinceId?: string | null): RedisNote[] {
		let parsedItems = notes.map(item => item.split(':'));

		if (untilId && sinceId) {
			parsedItems = parsedItems.filter(note => note[0] < untilId && note[0] > sinceId);
		} else if (untilId) {
			parsedItems = parsedItems.filter(note => note[0] < untilId);
		} else if (sinceId) {
			parsedItems = parsedItems.filter(note => note[0] > sinceId);
		}

		return parsedItems.map(item => {
			const [id, userId, renoteUserId, replyUserId, isNotQuote, isReplyToFollowers, isSensitive, visibility, visibleUserIds] = item;
			return {
				id,
				userId,
				renoteUserId,
				replyUserId,
				isNotQuote: isNotQuote === 'true',
				isReplyToFollowers: isReplyToFollowers === 'true',
				isSensitive: isSensitive === 'true',
				visibility,
				visibleUserIds: visibleUserIds.split(','),
			};
		});
	}

	@bindThis
	public purge(name: string) {
		return this.redisForTimelines.del('list:' + name);
	}
}
