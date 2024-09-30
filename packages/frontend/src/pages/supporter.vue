<template>
<MkStickyContainer>
	<template #header>
		<MkPageHeader :actions="headerActions" :tabs="headerTabs"/>
	</template>
	<div style="overflow: clip;">
		<MkSpacer :contentMax="600" :marginMin="20">
			<div class="_gaps_m">
				<p>{{ i18n.tsx.supporterDescription({ name: instance.name ?? host }) }}</p>
				<FormSection :first="true">
					<template #label>
						<Mfm text="$[jelly ❤]" :nyaize="false"/> {{ i18n.ts.supporterListTitle }}
					</template>
					<div :class="$style.supportersWithIcon">
						<MkA v-for="supporter in supporterNameWithIcon" :key="supporter.username" :class="$style.supporterWithIcon" :to="userPage({ username: supporter.username, host: null })">
							<img :class="$style.supporterIcon" :src="supporter.avatarUrl" decoding="async"/>
							<Mfm :class="$style.supporterName" :text="supporter.name" :plain="true" :nowrap="true" :nyaize="false"/>
						</MkA>
					</div>
					<div style="margin-top: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); grid-gap: 12px;">
						<div v-for="supporter in supporterName" :key="supporter.username" :class="$style.supporterNameWrapper">
							<MkA :class="$style.name" :to="userPage({ username: supporter.username, host: null })"><Mfm :class="$style.supporterName" :text="supporter.name" :plain="true" :nowrap="true" :nyaize="false"/></MkA>
						</div>
					</div>
					<p>{{ i18n.ts.moreSupporters }}</p>
				</FormSection>
			</div>
		</MkSpacer>
	</div>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import FormSection from '@/components/form/section.vue';
import { i18n } from '@/i18n.js';
import { host } from '@@/js/config.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { instance } from '@/instance.js';
import { userPage } from '@/filters/user.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';

 type SupporterUser = {
	username: string,
	name: string,
	avatarUrl: string,
	withIcon: boolean,
}

const supporterName = ref<SupporterUser[]>([]);
const supporterNameWithIcon = ref<SupporterUser[]>([]);

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

onMounted(async () => {
	const supporters = (await misskeyApi('supporter-list')) as SupporterUser[];
	supporters.forEach(supporter => {
		if (supporter.withIcon) {
			supporterNameWithIcon.value.push(supporter);
		} else {
			supporterName.value.push(supporter);
		}
	});
});

definePageMetadata({
	title: i18n.ts.supporterList,
	icon: null,
});
</script>

<style lang="scss" module>
.supportersWithIcon {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	grid-gap: 12px;
}

.supporterWithIcon {
	display: flex;
	align-items: center;
	padding: 12px;
	background: var(--buttonBg);
	border-radius: 6px;

	&:hover {
		text-decoration: none;
		background: var(--buttonHoverBg);
	}
}

.supporterIcon {
	width: 24px;
	height: 24px;
	border-radius: 100%;
}

.supporterName {
	margin-left: 12px;
}

.supporterNameWrapper {
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
}
</style>
