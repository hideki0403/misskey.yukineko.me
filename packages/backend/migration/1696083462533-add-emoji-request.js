/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class AddEmojiRequest1696083462533 {
    name = 'AddEmojiRequest1696083462533'

    async up(queryRunner) {
        await queryRunner.query(`CREATE TYPE "public"."emoji_request_status_enum" AS ENUM('pending', 'accepted', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "emoji_request" ("id" character varying(32) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "userId" character varying(32), "name" character varying(128) NOT NULL, "category" character varying(128), "aliases" character varying(128) array NOT NULL DEFAULT '{}', "license" character varying(1024), "localOnly" boolean NOT NULL DEFAULT false, "isSensitive" boolean NOT NULL DEFAULT false, "status" "public"."emoji_request_status_enum" NOT NULL DEFAULT 'pending', "comment" character varying(1024), "commentByAdmin" character varying(1024), "importedEmojiId" character varying(32), "imageId" character varying(32), CONSTRAINT "REL_ed932792a80aab757f6bf5af80" UNIQUE ("importedEmojiId"), CONSTRAINT "PK_3c74521e048dc744f0c7eb65f4a" PRIMARY KEY ("id")); COMMENT ON COLUMN "emoji_request"."createdAt" IS 'The created date of the EmojiRequest.'; COMMENT ON COLUMN "emoji_request"."updatedAt" IS 'The updated date of the EmojiRequest.'; COMMENT ON COLUMN "emoji_request"."userId" IS 'The owner ID.'`);
        await queryRunner.query(`CREATE INDEX "IDX_6eba9b135837cec1859b42e7da" ON "emoji_request" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_5e4674e4958377354d27ac8215" ON "emoji_request" ("updatedAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_a4091f9755eb7d8f7a0f44ae28" ON "emoji_request" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ea1d771e867e9843300f09d02c" ON "emoji_request" ("name") `);
        await queryRunner.query(`CREATE INDEX "IDX_ed932792a80aab757f6bf5af80" ON "emoji_request" ("importedEmojiId") `);
        await queryRunner.query(`ALTER TABLE "emoji_request" ADD CONSTRAINT "FK_a4091f9755eb7d8f7a0f44ae284" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emoji_request" ADD CONSTRAINT "FK_3c38bb51df3cca407f199268d0f" FOREIGN KEY ("imageId") REFERENCES "drive_file"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "emoji_request" ADD CONSTRAINT "FK_ed932792a80aab757f6bf5af80d" FOREIGN KEY ("importedEmojiId") REFERENCES "emoji"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "emoji_request" DROP CONSTRAINT "FK_ed932792a80aab757f6bf5af80d"`);
        await queryRunner.query(`ALTER TABLE "emoji_request" DROP CONSTRAINT "FK_3c38bb51df3cca407f199268d0f"`);
        await queryRunner.query(`ALTER TABLE "emoji_request" DROP CONSTRAINT "FK_a4091f9755eb7d8f7a0f44ae284"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ed932792a80aab757f6bf5af80"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea1d771e867e9843300f09d02c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a4091f9755eb7d8f7a0f44ae28"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5e4674e4958377354d27ac8215"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6eba9b135837cec1859b42e7da"`);
        await queryRunner.query(`DROP TABLE "emoji_request"`);
        await queryRunner.query(`DROP TYPE "public"."emoji_request_status_enum"`);
    }
}
