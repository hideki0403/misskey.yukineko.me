<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkStickyContainer>
	<template #header><XHeader :actions="headerActions" :tabs="headerTabs"/></template>
	<MkSpacer :contentMax="700" :marginMin="16" :marginMax="32">
		<FormSuspense :p="init">
			<MkFolder>
				<template #label>DeepL Translation</template>

				<div class="_gaps_m">
					<MkInput v-model="deeplAuthKey">
						<template #prefix><i class="ti ti-key"></i></template>
						<template #label>DeepL Auth Key</template>
					</MkInput>
					<MkSwitch v-model="deeplIsPro">
						<template #label>Pro account</template>
					</MkSwitch>
				</div>
			</MkFolder>
			<MkFolder>
				<template #label>Sentry logging</template>

				<div class="_gaps_m">
					<MkSwitch v-model="enableSentryLogging">
						<template #label>Enable sentry logging</template>
					</MkSwitch>
					<MkInput v-model="sentryDsn">
						<template #prefix><i class="ti ti-key"></i></template>
						<template #label>SentryDSN</template>
					</MkInput>
				</div>
			</MkFolder>
			<MkButton primary @click="save">Save</MkButton>
		</FormSuspense>
	</MkSpacer>
</MkStickyContainer>
</template>

<script lang="ts" setup>
import { ref, computed } from 'vue';
import XHeader from './_header_.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSuspense from '@/components/form/suspense.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { fetchInstance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import MkFolder from '@/components/MkFolder.vue';

const deeplAuthKey = ref('');
const deeplIsPro = ref(false);
const enableSentryLogging = ref(false);
const sentryDsn = ref('');

async function init() {
	const meta = await misskeyApi('admin/meta');
	deeplAuthKey.value = meta.deeplAuthKey;
	deeplIsPro.value = meta.deeplIsPro;
	enableSentryLogging.value = meta.enableSentryLogging;
	sentryDsn.value = meta.sentryDsn;
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		deeplAuthKey: deeplAuthKey.value,
		deeplIsPro: deeplIsPro.value,
		enableSentryLogging: enableSentryLogging.value,
		sentryDsn: sentryDsn.value,
	}).then(() => {
		fetchInstance(true);
	});
}

const headerActions = computed(() => []);
const headerTabs = computed(() => []);

definePageMetadata(() => ({
	title: i18n.ts.externalServices,
	icon: 'ti ti-link',
}));
</script>
