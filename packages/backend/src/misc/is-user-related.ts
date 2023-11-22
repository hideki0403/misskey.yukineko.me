/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export function isUserRelated(note: any, userIds: Set<string>, ignoreAuthor = false): boolean {
	if (userIds.has(note.userId) && !ignoreAuthor) {
		return true;
	}

	if (note.replyUserId != null && note.replyUserId !== note.userId && userIds.has(note.replyUserId)) {
		return true;
	}

	if (note.renoteUserId != null && note.renoteUserId !== note.userId && userIds.has(note.renoteUserId)) {
		return true;
	}

	return false;
}
