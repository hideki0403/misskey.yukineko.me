<template>
<div v-tooltip="instance.name" :class="$style.root" :style="bg">
	<img v-if="faviconUrl" :class="$style.icon" :src="faviconUrl"/>
	<span v-if="!faviconUrl" :class="$style.name">{{ firstLetter }}</span>
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
const firstLetter = instance.name?.slice(0, 1);

const themeColor = instance.themeColor ?? '#777777';

const bg = {
	background: themeColor,
};
</script>

<style lang="scss" module>

.root {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 2em;
	width: 2em;
	border-radius: 0 0 8px 0;
}

.icon {
	height: 1em;
	flex-shrink: 0;
	border-radius: 25%;
	filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.75));
}

.name {
	font-size: 1em;
	font-weight: bold;
	filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.75));
}
</style>
