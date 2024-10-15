<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div>
	<div :class="$style.banner">
		<i class="ti ti-ticket"></i>
	</div>
	<MkSpacer :marginMin="20" :marginMax="28">
		<div class="_gaps_m" :class="$style.root">
			<MkInfo info>
				{{ i18n.tsx.registrationLimitDetails({ limit: instance.registrationLimitCooldown, count:
					instance.registrationLimit }) }}
			</MkInfo>
			<div>{{ i18n.ts.doYouHaveInviteCode }}</div>
			<div class="_buttonsCenter">
				<MkButton
					:class="$style.choiceButton" inline large style="color: var(--MI_THEME-success);"
					@click="doneWithCode"
				>
					<i class="ti ti-circle-check-filled"></i> {{ i18n.ts.hasInviteCode }}
				</MkButton>
				<MkButton
					:class="$style.choiceButton" inline large style="color: var(--MI_THEME-error);"
					@click="doneWithoutCode"
				>
					<i class="ti ti-circle-x-filled"></i> {{ i18n.ts.doesNotHaveInviteCode }}
				</MkButton>
			</div>
			<MkButton inline rounded @click="emit('cancel')">{{ i18n.ts.cancel }}</MkButton>
		</div>
	</MkSpacer>
</div>
</template>

<script lang="ts" setup>
import { instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import MkButton from '@/components/MkButton.vue';
import MkInfo from '@/components/MkInfo.vue';
import * as os from '@/os.js';

const emit = defineEmits<{
	(ev: 'cancel'): void;
	(ev: 'done', inviteCode: boolean): void;
}>();

function doneWithCode() {
	emit('done', true);
}

async function doneWithoutCode() {
	const res = await os.apiWithDialog('signup-available');
	if (!res.available) {
		return await os.alert({
			type: 'error',
			title: i18n.ts.error,
			text: i18n.tsx.hitRegistrationLimit({ time: instance.registrationLimitCooldown }),
		});
	}

	emit('done', false);
}
</script>

<style lang="scss" module>
.root {
	align-items: center;
}

.choiceButton {
	height: 60px;
	width: 100% !important;
}

.banner {
	padding: 16px;
	text-align: center;
	font-size: 26px;
	background-color: var(--MI_THEME-accentedBg);
	color: var(--MI_THEME-accent);
}

.rules {
	counter-reset: item;
	list-style: none;
	padding: 0;
	margin: 0;
}

.rule {
	display: flex;
	gap: 8px;
	word-break: break-word;

	&::before {
		flex-shrink: 0;
		display: flex;
		position: sticky;
		top: calc(var(--stickyTop, 0px) + 8px);
		counter-increment: item;
		content: counter(item);
		width: 32px;
		height: 32px;
		line-height: 32px;
		background-color: var(--MI_THEME-accentedBg);
		color: var(--MI_THEME-accent);
		font-size: 13px;
		font-weight: bold;
		align-items: center;
		justify-content: center;
		border-radius: 999px;
	}
}

.ruleText {
	padding-top: 6px;
}
</style>
