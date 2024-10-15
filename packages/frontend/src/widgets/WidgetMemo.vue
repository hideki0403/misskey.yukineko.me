<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkContainer :showHeader="widgetProps.showHeader" data-cy-mkw-memo class="mkw-memo">
	<template #icon><i class="ti ti-note"></i></template>
	<template #header>{{ widgetProps.name || i18n.ts._widgets.memo }}</template>

	<div>
		<textarea v-model="text" :style="`height: ${widgetProps.height}px;`" :class="$style.textarea" :placeholder="i18n.ts.addMemo" @input="onChange"></textarea>
		<div :class="$style.buttons">
			<MkButton small @click="showMemoList"><i class="ti ti-list"></i></MkButton>
			<MkButton small primary :disabled="!changed" @click="saveMemo">{{ i18n.ts.save }}</MkButton>
		</div>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, ref, watch } from 'vue';
import { v4 as uuid } from 'uuid';
import { useWidgetPropsManager, WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget.js';
import { GetFormResultType } from '@/scripts/form.js';
import MkContainer from '@/components/MkContainer.vue';
import MkButton from '@/components/MkButton.vue';
import { defaultStore } from '@/store.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const name = 'memo';

const widgetPropsDef = {
	showHeader: {
		type: 'boolean' as const,
		default: true,
	},
	name: {
		type: 'string' as const,
		default: '',
	},
	height: {
		type: 'number' as const,
		default: 100,
	},
};

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();

const { widgetProps, configure } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

const getMemo = () => {
	if (!props.widget) return;
	const memo = defaultStore.state.memo;
	if (typeof memo === 'string') return memo;
	if (memo && typeof memo === 'object') return memo[props.widget.id];
	return;
};

const text = ref<string>(getMemo() ?? '');
const changed = ref(false);
let timeoutId: number | undefined;

const saveMemo = () => {
	const memo = defaultStore.state.memo;
	const list = memo && typeof memo === 'object' ? memo : {};
	list[props.widget?.id ?? uuid()] = text.value;
	defaultStore.set('memo', list);
	changed.value = false;
};

const showMemoList = () => {
	if (!props.widget) {
		os.alert({
			type: 'error',
			title: i18n.ts.error,
			text: i18n.ts.somethingHappened,
		});
		return;
	}

	os.popup(defineAsyncComponent(() => import('@/components/MkMemoSelectDialog.vue')), {
		widgetId: props.widget.id,
	}, 'closed');
};

const onChange = () => {
	changed.value = true;
	window.clearTimeout(timeoutId);
	timeoutId = window.setTimeout(saveMemo, 1000);
};

watch(defaultStore.reactiveState.memo, () => {
	text.value = getMemo() ?? '';
});

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" module>
.textarea {
	display: block;
	width: 100%;
	max-width: 100%;
	min-width: 100%;
	padding: 16px;
	color: var(--MI_THEME-fg);
	background: transparent;
	border: none;
	border-bottom: solid 0.5px var(--MI_THEME-divider);
	border-radius: 0;
	box-sizing: border-box;
	font: inherit;
	font-size: 0.9em;

	&:focus-visible {
		outline: none;
	}
}

.buttons {
	display: flex;
	justify-content: space-between;
	margin: 10px;

	& > * {
		min-width: auto;
	}
}
</style>
