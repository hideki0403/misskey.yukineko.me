/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { PrimaryColumn, Entity, Index, Column, ManyToOne, JoinColumn } from 'typeorm';
import { id } from './util/id.js';
import { MiDriveFile } from './DriveFile.js';
import { MiUser } from './User.js';

@Entity('emoji_request')
export class MiEmojiRequest {
	@PrimaryColumn(id())
	public id: string;

	@Index()
	@Column('timestamp with time zone', {
		comment: 'The created date of the EmojiRequest.',
	})
	public createdAt: Date;

	@Index()
	@Column('timestamp with time zone', {
		comment: 'The updated date of the EmojiRequest.',
	})
	public updatedAt: Date;

	@Index()
	@Column({
		...id(),
		nullable: true,
		comment: 'The owner ID.',
	})
	public userId: MiUser['id'] | null;

	@ManyToOne(type => MiUser, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public user: MiUser | null;

	@ManyToOne(type => MiDriveFile, {
		onDelete: 'CASCADE',
	})
	@JoinColumn()
	public image: MiDriveFile | null;

	@Index()
	@Column('varchar', {
		length: 128,
	})
	public name: string;

	@Column('varchar', {
		length: 128, nullable: true,
	})
	public category: string | null;

	@Column('varchar', {
		array: true, length: 128, default: '{}',
	})
	public aliases: string[];

	@Column('varchar', {
		length: 1024, nullable: true,
	})
	public license: string | null;

	@Column('boolean', {
		default: false,
	})
	public localOnly: boolean;

	@Column('boolean', {
		default: false,
	})
	public isSensitive: boolean;

	@Column('enum', {
		enum: ['pending', 'accepted', 'rejected'],
		default: 'pending',
	})
	public status: 'pending' | 'accepted' | 'rejected';

	@Column('varchar', {
		length: 1024, nullable: true,
	})
	public comment: string | null;

	@Column('varchar', {
		length: 1024, nullable: true,
	})
	public commentByAdmin: string | null;

	@Column('boolean', {
		default: false,
	})
	public isImported: boolean;
}
