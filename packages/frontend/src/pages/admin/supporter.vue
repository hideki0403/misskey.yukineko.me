<template>
<MkStickyContainer>
	<template #header>
		<XHeader :tabs="headerTabs"/>
	</template>
	<MkSpacer :contentMax="700" :marginMin="16" :marginMax="32">
		<FormSuspense :p="init">
			<div class="_gaps_m">
				<MkSwitch v-model="enableSupporterPage">{{ i18n.ts.enableSupporterPage }}</MkSwitch>

				<template v-if="enableSupporterPage">
					<MkTextarea v-model="supporterRoles">
						<template #label>{{ i18n.ts.supporterRoles }}</template>
						<template #caption>{{ i18n.ts.supporterRolesDescription }}</template>
					</MkTextarea>

					<MkInput v-model="supporterNameThreshold" type="number">
						<template #label>{{ i18n.ts.supporterNameThreshold }}</template>
						<template #caption>{{ i18n.ts.supporterNameThresholdDescription }}</template>
					</MkInput>

					<MkInput v-model="supporterNameWithIconThreshold" type="number">
						<template #label>{{ i18n.ts.supporterNameWithIconThreshold }}</template>
						<template #caption>{{ i18n.ts.supporterNameWithIconThresholdDescription }}</template>
					</MkInput>
				</template>
			</div>
		</FormSuspense>
	</MkSpacer>
	<template #footer>
		<div :class="$style.footer">
			<MkSpacer :contentMax="700" :marginMin="16" :marginMax="16">
				<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
			</MkSpacer>
		</div>
	</template>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import XHeader from './_header_.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import FormSuspense from '@/components/form/suspense.vue';
import * as os from '@/os.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { misskeyApi } from '@/scripts/misskey-api.js';

const enableSupporterPage = ref(false);
const supporterRoles = ref('');
const supporterNameThreshold = ref<number | null>(null);
const supporterNameWithIconThreshold = ref<number | null>(null);

async function init() {
	const meta = await misskeyApi('admin/meta');
	enableSupporterPage.value = meta.enableSupporterPage ?? false;
	supporterRoles.value = meta.supporterRoles?.join('\n') ?? '';
	supporterNameThreshold.value = meta.supporterNameThreshold ?? null;
	supporterNameWithIconThreshold.value = meta.supporterNameWithIconThreshold ?? null;
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		enableSupporterPage: enableSupporterPage.value,
		supporterRoles: supporterRoles.value.split('\n'),
		supporterNameThreshold: supporterNameThreshold.value,
		supporterNameWithIconThreshold: supporterNameWithIconThreshold.value,
	}).then(() => {
		fetchInstance();
	});
}

const headerTabs = computed(() => []);

definePageMetadata({
	title: i18n.ts.supporter,
	icon: 'ti ti-cash',
});
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI_THEME-blur, blur(15px));
	backdrop-filter: var(--MI_THEME-blur, blur(15px));
}
</style>
