<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="defaultStore.state.showConnectionStatus" :class="[$style.root, hasDisconnected ? $style.offline : $style.online]" class="_panel _shadow">
	<i ref="statusIcon" class="ti" :class="[$style.icon, hasDisconnected ? 'ti-circle' : 'ti-circle-filled']"></i>
	<span>{{ hasDisconnected ? i18n.ts.offline : i18n.ts.online }}</span>
</div>
</template>

<script lang="ts" setup>
import { onUnmounted, ref, shallowRef } from 'vue';
import { useStream } from '@/stream.js';
import * as os from '@/os.js';
import { i18n } from '@/i18n.js';
import { defaultStore } from '@/store.js';
import MkRippleEffect from '@/components/MkRippleEffect.vue';

const zIndex = os.claimZIndex('middle');

const statusIcon = shallowRef<HTMLElement>();
const hasDisconnected = ref(false);

function onConnected() {
	hasDisconnected.value = false;
	showRipple();
}

function onDisconnected() {
	hasDisconnected.value = true;
	showRipple();
}

function showRipple() {
	if (statusIcon.value) {
		const el = statusIcon.value;
		if (el) {
			const rect = el.getBoundingClientRect();
			const x = rect.left + (el.offsetWidth / 2);
			const y = rect.top + (el.offsetHeight / 2);
			os.popup(MkRippleEffect, { x, y, particle: false }, {}, 'end');
		}
	}
}

useStream().on('_connected_', onConnected);
useStream().on('_disconnected_', onDisconnected);

onUnmounted(() => {
	useStream().off('_connected_', onConnected);
	useStream().off('_disconnected_', onDisconnected);
});
</script>

<style lang="scss" module>
.root {
	position: fixed;
	display: flex;
	gap: 4px;
	z-index: v-bind(zIndex);
	bottom: calc(var(--MI_THEME-minBottomSpacing) + var(--margin));
	right: var(--margin);
	margin: 0;
	padding: 6px 8px;
	border-radius: 8px;
	font-size: 0.8em;
	max-width: 320px;
	user-select: none;
}

.command {
	margin-top: 8px;
}

.online {
	color: var(--MI_THEME-accent);
}

.offline {
	color: var(--MI_THEME-fg);
}

.icon {
	line-height: unset;
	font-size: 0.8em;
}
</style>
