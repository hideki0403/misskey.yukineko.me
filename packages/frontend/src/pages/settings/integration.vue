<template>
	<div class="_gaps_m">
		<FormSection v-if="instance.enablePatreonIntegration" :first="true">
			<template #label>
				<i class="ti ti-brand-patreon"></i>
				Patreon
				<span class="_beta">{{ i18n.ts.originalFeature }}</span>
			</template>
			<p v-if="integrations.patreon">{{ i18n.ts.connectedTo }}: <a href="https://www.patreon.com/home" rel="nofollow noopener" target="_blank">{{ integrations.patreon.id }}</a></p>
			<div v-if="integrations.patreon" class="_gaps_s">
				<MkButton danger @click="disconnectPatreon">{{ i18n.ts.disconnectService }}</MkButton>
				<MkButton primary @click="requestPatreonRefresh">{{ i18n.ts.requestRefresh }}</MkButton>
			</div>
			<MkButton v-else primary @click="connectPatreon">{{ i18n.ts.connectService }}</MkButton>
		</FormSection>
		<FormSection v-if="instance.enableFanboxIntegration" :first="!instance.enablePatreonIntegration">
			<template #label>
				<i class="ti ti-square-rounded-letter-p"></i>
				PixivFANBOX
				<span class="_beta">{{ i18n.ts.originalFeature }}</span>
			</template>
			<p v-if="integrations.fanbox">{{ i18n.ts.connectedTo }}: <a :href="'https://www.pixiv.net/users/' + integrations.fanbox.id" rel="nofollow noopener" target="_blank">{{ integrations.fanbox.id }}</a></p>
			<div v-if="integrations.fanbox" class="_gaps_s">
				<MkButton danger @click="disconnectFanbox">{{ i18n.ts.disconnectService }}</MkButton>
				<MkButton primary @click="requestFanboxRefresh">{{ i18n.ts.requestRefresh }}</MkButton>
			</div>
			<MkButton v-else primary @click="connectFanbox">{{ i18n.ts.connectService }}</MkButton>
		</FormSection>
	</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { apiUrl } from '@@/js/config.js';
import * as os from '@/os.js';
import FormSection from '@/components/form/section.vue';
import MkButton from '@/components/MkButton.vue';
import { $i } from '@/account.js';
import { instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePageMetadata } from '@/scripts/page-metadata.js';
import { misskeyApi } from '@/scripts/misskey-api.js';

const patreonForm = ref<Window | null>(null);

const integrations = computed(() => $i!.integrations ?? {} as Record<string, any>);

function openWindow(service: string, type: string) {
	return window.open(`${apiUrl}/${type}/${service}`,
		`${service}_${type}_window`,
		'height=570, width=520',
	);
}

function connectPatreon() {
	patreonForm.value = openWindow('patreon', 'connect');
}

function disconnectPatreon() {
	openWindow('patreon', 'disconnect');
}

async function requestPatreonRefresh() {
	await misskeyApi('integrations/patreon/request-refresh');

	os.alert({
		type: 'success',
		title: i18n.ts.requestedRefresh,
		text: i18n.ts.requestedRefreshDetails,
	});
}

async function connectFanbox() {
	const { canceled, result } = await os.inputText({
		text: i18n.ts.enterPixivIdOrUrl,
	});

	if (canceled) return;

	let id: string | null = null;

	if (!isNaN(Number(result))) {
		id = result;
	} else {
		const match = result.match(/www.pixiv.net\/users\/(\d+)/)?.[1];

		if (!isNaN(Number(match))) {
			id = match as string;
		}
	}

	if (!id) {
		return os.alert({
			type: 'error',
			title: i18n.ts.error,
			text: i18n.ts.invalidPixivId,
		});
	}

	const res = await misskeyApi('integrations/fanbox/connect', { id });
	if (res.error) {
		return os.alert({
			type: 'error',
			title: i18n.ts.error,
			text: i18n.ts.failedToSetPixivId,
		});
	}

	os.alert({
		type: 'success',
		text: i18n.ts.connectionSucceeded,
	});
}

async function disconnectFanbox() {
	await os.apiWithDialog('integrations/fanbox/disconnect');
}

async function requestFanboxRefresh() {
	await misskeyApi('integrations/fanbox/request-refresh');

	os.alert({
		type: 'success',
		title: i18n.ts.requestedRefresh,
		text: i18n.ts.requestedRefreshDetails,
	});
}

onMounted(() => {
	document.cookie = `igi=${$i!.token}; path=/;` +
		' max-age=31536000;' +
		(document.location.protocol.startsWith('https') ? ' secure' : '');

	watch(integrations, () => {
		if (integrations.value?.patreon) {
			if (patreonForm.value) patreonForm.value.close();
		}
	});
});

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePageMetadata({
	title: i18n.ts.integration,
	icon: 'ti ti-share',
});
</script>
