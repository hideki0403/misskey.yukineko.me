<template>
<div v-tooltip="instance.name" :class="$style.root">
	<img v-if="faviconUrl" :class="$style.icon" :src="faviconUrl"/>
	<i v-if="!faviconUrl" class="ti ti-whirl"></i>
</div>
</template>

<script lang="ts" setup>
import { computed, defineProps } from 'vue';
import * as Misskey from 'misskey-js';
import { instanceName } from '@@/js/config.js';
import { instance as Instance } from '@/instance.js';
import { getProxiedImageUrlNullable } from '@/scripts/media-proxy.js';

const props = defineProps<{
	instance?: Misskey.entities.User['instance'];
}>();

// if no instance data is given, this is for the local instance
const instance = props.instance ?? {
	name: instanceName,
	themeColor: (document.querySelector('meta[name="theme-color-orig"]') as HTMLMetaElement).content,
};

const faviconUrl = computed(() => props.instance ? getProxiedImageUrlNullable(props.instance.faviconUrl, 'preview') : getProxiedImageUrlNullable(Instance.iconUrl, 'preview') ?? getProxiedImageUrlNullable(Instance.iconUrl, 'preview') ?? '/favicon.ico');
</script>

<style lang="scss" module>
.root {
	display: inline-flex;
	justify-content: center;
	vertical-align: top;
}

.icon {
	height: 1.3em;
	flex-shrink: 0;
	border-radius: 25%;
}
</style>
