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

type TimelineFilters = {
	meId?: string;
	withRenotes?: boolean;
	isPublicTimeline?: boolean;
	userTimeline?: {
		isSelf: boolean;
		isFollowing: boolean;
	};
	mutingUserIds?: Set<string>;
	mutingRenoteUserIds?: Set<string>;
	blockingMeUserIds?: Set<string>;
	followingUserIds?: Set<string>;
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
	public async get(name: string, untilId?: string | null, sinceId?: string | null, filters?: TimelineFilters | null) {
		const timeline = await this.redisForTimelines.lrange('list:' + name, 0, -1);
		return this.filter(timeline, untilId, sinceId, filters);
	}

	@bindThis
	public async getMulti(name: string[], untilId?: string | null, sinceId?: string | null, filters?: TimelineFilters | null): Promise<string[]> {
		const pipeline = this.redisForTimelines.pipeline();
		for (const n of name) {
			pipeline.lrange('list:' + n, 0, -1);
		}

		const res = await pipeline.exec();
		if (res == null) return [];

		const tls = res.map(r => r[1] as string[]).flat();
		const ids = Array.from(new Set(tls));

		return this.filter(ids, untilId, sinceId, filters);
	}

	@bindThis
	private filter(notes: string[], untilId?: string | null, sinceId?: string | null, filters?: TimelineFilters | null) {
		let timeline = notes.map(item => {
			const [id, userId, renoteUserId, replyUserId, isNotQuote, isReplyToFollowers, isSensitive, visibility, visibleUserIds] = item.split(':');
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

		if (untilId && sinceId) {
			timeline = timeline.filter(note => note.id < untilId && note.id > sinceId);
		} else if (untilId) {
			timeline = timeline.filter(note => note.id < untilId);
		} else if (sinceId) {
			timeline = timeline.filter(note => note.id > sinceId);
		}

		const meId = filters?.meId;

		if (filters) {
			timeline = timeline.filter(note => {
				if (note.userId == null) return false; // Redisに保持されている以前のバージョンのレコードはuserId等の情報が含まれていないため

				if (meId && note.userId === meId) return true;

				// 自分がそのユーザーをミュートしている/ブロックされているか
				if (filters.mutingUserIds?.has(note.userId)) return false;
				if (filters.blockingMeUserIds?.has(note.userId)) return false;

				if (note.replyUserId) {
					// ノートのリプライ先がフォロワーのみで、リプライ先を自分がフォローしているか
					if (note.isReplyToFollowers && !filters.followingUserIds?.has(note.replyUserId)) return false;

					// 自分がリプライ先のユーザーをミュートしている/ブロックされているか
					if (filters.mutingUserIds?.has(note.replyUserId)) return false;
					if (filters.blockingMeUserIds?.has(note.replyUserId)) return false;

					if (filters.isPublicTimeline) {
						// パブリックなTL (LTL) 上での他人による他人へのリプライかどうか (その人自身への返信は含まない)
						if (note.userId !== note.replyUserId && !filters.followingUserIds?.has(note.userId) && !filters.followingUserIds?.has(note.replyUserId)) return false;
					}
				}

				if (note.renoteUserId) {
					// withRenotesが有効で、対象のノートが引用ノートではないか
					if (note.isNotQuote && filters.withRenotes === false) return false;

					// 自分がリノートしたユーザーのリノートミュートをしているか
					if (filters.mutingRenoteUserIds?.has(note.userId)) return false;

					// 自分がリノート先のユーザーをミュートしている/ブロックされているか
					if (filters.mutingUserIds?.has(note.renoteUserId)) return false;
					if (filters.blockingMeUserIds?.has(note.renoteUserId)) return false;
				}

				if (filters.userTimeline) {
					// 他人のユーザータイムラインでセンシティブチャンネルの投稿かどうか
					if (note.isSensitive && !filters.userTimeline.isSelf) return false;

					// 他人のユーザータイムラインで自分宛てのDM/フォロワー限定投稿かどうか
					if (note.visibility === 'specified' && (!meId || (meId !== note.userId && !note.visibleUserIds.some(v => v === meId)))) return false;
					if (note.visibility === 'followers' && !filters.userTimeline.isFollowing && !filters.userTimeline.isSelf) return false;
				}

				return true;
			});
		}

		return timeline.map(note => note.id).sort((a, b) => a > b ? -1 : 1);
	}

	@bindThis
	public purge(name: string) {
		return this.redisForTimelines.del('list:' + name);
	}
}
