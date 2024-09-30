<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_panel _shadow" :class="$style.root">
	<div :class="$style.main">
		<div :class="$style.title">✨ {{ i18n.ts.misskeyUpdated }}</div>
		<div :class="$style.text">
			Misskey: {{ misskeyVersion }}
			<br>
			隠れ家: {{ kakuregaVersion }}
		</div>
		<div class="_buttons">
			<MkButton full @click="whatIsNew">{{ i18n.ts.whatIsNew }}</MkButton>
			<MkButton full @click="whatIsNewKakurega">{{ i18n.ts.whatIsNewKakurega }}</MkButton>
			<MkButton full primary @click="close">{{ i18n.ts.gotIt }}</MkButton>
		</div>
	</div>
	<button class="_button" :class="$style.close" @click="close"><i class="ti ti-x"></i></button>
</div>
</template>

<script lang="ts" setup>
import * as os from '@/os.js';
import MkButton from '@/components/MkButton.vue';
import MkSparkle from '@/components/MkSparkle.vue';
import { version } from '@@/js/config.js';
import { i18n } from '@/i18n.js';

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const zIndex = os.claimZIndex('low');

const misskeyVersion = version.split('-')[0];
const kakuregaVersion = version.split('-')[1].replace('kakurega.', '');

function close() {
	emit('closed');
}

function whatIsNew() {
	emit('closed');
	window.open(`https://misskey-hub.net/docs/releases/#_${version.split('-')[0].replace(/\./g, '-')}`, '_blank');
};

function whatIsNewKakurega() {
	emit('closed');
	window.open('https://github.com/hideki0403/misskey.yukineko.me/blob/master-kakurega/CHANGELOG_KAKUREGA.md', '_blank');
};
</script>

<style lang="scss" module>
.root {
	position: fixed;
	z-index: v-bind(zIndex);
	bottom: var(--margin);
	left: 0;
	right: 0;
	margin: auto;
	box-sizing: border-box;
	width: calc(100% - (var(--margin) * 2));
	max-width: 500px;
	display: flex;
}

.main {
	padding: 25px;
	flex: 1;
}

.close {
	position: absolute;
	top: 8px;
	right: 8px;
	padding: 8px;
}

.title {
	font-weight: bold;
}

.text {
	margin: 0.7em 0 1em 0;
}
</style>
