<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkPagination ref="pagingComponent" :pagination="pagination" :disableAutoLoad="disableAutoLoad" :displayLimit="overrideDisplayLimit" :suppressInfinityFetch="isNeedSuppressInfinityFetch()">
	<template #empty>
		<div class="_fullinfo">
			<img :src="infoImageUrl" class="_ghost"/>
			<div>{{ i18n.ts.noNotes }}</div>
		</div>
	</template>

	<template #default="{ items: notes }">
		<div :class="[$style.root, { [$style.noGap]: noGap }]">
			<MkDateSeparatedList
				ref="notes"
				v-slot="{ item: note }"
				:items="notes"
				:direction="pagination.reversed ? 'up' : 'down'"
				:reversed="pagination.reversed"
				:noGap="noGap"
				:ad="true"
				:class="$style.notes"
			>
				<MkNote v-if="!isFilteredNote(note) && !isNeedHide(note)" :key="note._featuredId_ || note._prId_ || note.id" :class="$style.note" :note="note" :withHardMute="true"/>
			</MkDateSeparatedList>
		</div>
	</template>
</MkPagination>
</template>

<script lang="ts" setup>
import { shallowRef, ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkNote from '@/components/MkNote.vue';
import MkDateSeparatedList from '@/components/MkDateSeparatedList.vue';
import MkPagination, { Paging } from '@/components/MkPagination.vue';
import { i18n } from '@/i18n.js';
import { infoImageUrl } from '@/instance.js';
import { defaultStore } from '@/store.js';
import { $i } from '@/account.js';
import { checkWordMute } from '@/scripts/check-word-mute.js';

export type Filter = {
	includeKeywords?: string[];
	includeKeywordsAll?: string[];
	excludeKeywords?: string[];
	includeInstances?: string[];
	excludeInstances?: string[];
	excludeRenotes?: boolean;
	excludeReplies?: boolean;
	mediaOnly?: boolean;
}

const props = defineProps<{
	pagination: Paging;
	noGap?: boolean;
	filter?: Filter;
	disableAutoLoad?: boolean;
}>();

const overrideDisplayLimit = ref<undefined | number>();

if (defaultStore.state.enableOverrideTLDisplayLimit) {
	overrideDisplayLimit.value = defaultStore.state.overrideTLDisplayLimit < 20 ? 20 : defaultStore.state.overrideTLDisplayLimit;
}

const isNeedHide = (note: Misskey.entities.Note) => {
	return $i ? checkWordMute(note, $i, $i.mutedWords) : false;
};

const pagingComponent = shallowRef<InstanceType<typeof MkPagination>>();

const isNeedSuppressInfinityFetch = () => {
	return props.filter && Object.values(props.filter).some(x => x);
};

const isFilteredNote = (note: Misskey.entities.Note) => {
	if (!props.filter) return false;
	const filter = props.filter;

	if (filter.excludeRenotes && note.renote) return true;
	if (filter.excludeReplies && note.reply) return true;
	if (filter.mediaOnly && !note.fileIds?.length && !note.renote?.fileIds?.length) return true;

	if (filter.excludeInstances?.some(instance => note.user.host === instance)) return true;
	if (filter.includeInstances && !filter.includeInstances.some(instance => note.user.host === instance)) return true;

	if (filter.excludeKeywords?.some(keyword => note.text?.includes(keyword))) return true;
	if (filter.includeKeywords && !filter.includeKeywords.some(keyword => note.text?.includes(keyword))) return true;
	if (filter.includeKeywordsAll && !filter.includeKeywordsAll.every(keyword => note.text?.includes(keyword))) return true;

	return false;
};

defineExpose({
	pagingComponent,
});
</script>

<style lang="scss" module>
.root {
	&.noGap {
		> .notes {
			background: var(--MI_THEME-panel);
		}
	}

	&:not(.noGap) {
		> .notes {
			background: var(--MI_THEME-bg);

			.note {
				background: var(--MI_THEME-panel);
				border-radius: var(--MI-radius);
			}
		}
	}
}
</style>
