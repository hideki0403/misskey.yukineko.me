<template>
<div :class="$style.root">
	<XSidebar v-if="!isMobile" :class="$style.sidebar"/>

	<MkStickyContainer ref="contents" :class="$style.contents" style="container-type: inline-size;" @contextmenu.stop="onContextmenu">
		<template #header>
			<div>
				<XAnnouncements v-if="$i"/>
				<XStatusBars :class="$style.statusbars"/>
				<MkPageHeader v-if="isRoot" :actions="headerActions"/>
			</div>
		</template>
		<MkSpacer v-if="isRoot" :contentMax="800">
			<MkPostForm :class="$style.postForm" class="post-form _panel" fixed style="margin-bottom: var(--margin);"/>
			<XWidgets v-if="showWidgets" :class="$style.widgets"/>
		</MkSpacer>
		<RouterView v-else/>
		<div :class="$style.spacer"></div>
	</MkStickyContainer>

	<div v-if="isMobile" ref="navFooter" :class="$style.nav">
		<button :class="$style.navButton" class="_button" @click="drawerMenuShowing = true"><i :class="$style.navButtonIcon" class="ti ti-menu-2"></i><span v-if="menuIndicated" :class="$style.navButtonIndicator" class="_blink"><i class="_indicatorCircle"></i></span></button>
		<button :class="$style.navButton" class="_button" @click="isRoot ? top() : mainRouter.push('/')"><i :class="$style.navButtonIcon" class="ti ti-home"></i></button>
		<button :class="$style.postButton" class="_button" @click="os.post()"><i :class="$style.navButtonIcon" class="ti ti-pencil"></i></button>
	</div>

	<Transition
		:enterActiveClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_enterActive : ''"
		:leaveActiveClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_leaveActive : ''"
		:enterFromClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_enterFrom : ''"
		:leaveToClass="defaultStore.state.animation ? $style.transition_menuDrawerBg_leaveTo : ''"
	>
		<div
			v-if="drawerMenuShowing"
			:class="$style.menuDrawerBg"
			class="_modalBg"
			@click="drawerMenuShowing = false"
			@touchstart.passive="drawerMenuShowing = false"
		></div>
	</Transition>

	<Transition
		:enterActiveClass="defaultStore.state.animation ? $style.transition_menuDrawer_enterActive : ''"
		:leaveActiveClass="defaultStore.state.animation ? $style.transition_menuDrawer_leaveActive : ''"
		:enterFromClass="defaultStore.state.animation ? $style.transition_menuDrawer_enterFrom : ''"
		:leaveToClass="defaultStore.state.animation ? $style.transition_menuDrawer_leaveTo : ''"
	>
		<div v-if="drawerMenuShowing" :class="$style.menuDrawer">
			<XDrawerMenu/>
		</div>
	</Transition>

	<XCommon/>
</div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, onMounted, computed, ref, watch, shallowRef, Ref } from 'vue';
import { instanceName } from '@@/js/config.js';
import { CURRENT_STICKY_BOTTOM } from '@@/js/const.js';
import { isLink } from '@@/js/is-link.js';
import XCommon from './_common_/common.vue';
import type MkStickyContainer from '@/components/global/MkStickyContainer.vue';
import XDrawerMenu from '@/ui/_common_/navbar-for-mobile.vue';
import MkPostForm from '@/components/MkPostForm.vue';
import * as os from '@/os.js';
import { defaultStore } from '@/store.js';
import { navbarItemDef } from '@/navbar.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/account.js';
import { PageMetadata, provideMetadataReceiver, provideReactiveMetadata } from '@/scripts/page-metadata.js';
import { deviceKind } from '@/scripts/device-kind.js';
import { miLocalStorage } from '@/local-storage.js';
import { useScrollPositionManager } from '@/nirax.js';
import { mainRouter } from '@/router/main.js';
import { zenStore } from '@/ui/universal-zen/zen-store.js';

const XWidgets = defineAsyncComponent(() => import('./universal.widgets.vue'));
const XSidebar = defineAsyncComponent(() => import('@/ui/_common_/navbar.vue'));
const XStatusBars = defineAsyncComponent(() => import('@/ui/_common_/statusbars.vue'));
const XAnnouncements = defineAsyncComponent(() => import('@/ui/_common_/announcements.vue'));

const isRoot = computed(() => mainRouter.currentRoute.value.name === 'index');

const DESKTOP_THRESHOLD = 1100;
const MOBILE_THRESHOLD = 500;

// デスクトップでウィンドウを狭くしたときモバイルUIが表示されて欲しいことはあるので deviceKind === 'desktop' の判定は行わない
const isDesktop = ref(window.innerWidth >= DESKTOP_THRESHOLD);
const isMobile = ref(deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD);
window.addEventListener('resize', () => {
	isMobile.value = deviceKind === 'smartphone' || window.innerWidth <= MOBILE_THRESHOLD;
});

const defaultPageMetadata: PageMetadata = {
	title: i18n.ts.zenMode,
	icon: 'ti ti-seeding',
};

const pageMetadata = ref<null | PageMetadata>(isRoot.value ? defaultPageMetadata : null);
const navFooter = shallowRef<HTMLElement>();
const contents = shallowRef<InstanceType<typeof MkStickyContainer>>();

const showWidgets = ref(zenStore.state.showWidgets);
watch(zenStore.reactiveState.showWidgets, (value) => {
	showWidgets.value = value;
});

watch(mainRouter.currentRoute, () => {
	const isRootPage = mainRouter.currentRoute.value.name === 'index';
	isRoot.value = isRootPage;

	if (isRootPage) {
		pageMetadata.value = defaultPageMetadata;
	}
});

provide('router', mainRouter);
provideMetadataReceiver((metadataGetter) => {
	const info = metadataGetter();
	pageMetadata.value = info;
	if (pageMetadata.value) {
		if (isRoot.value && pageMetadata.value.title === instanceName) {
			document.title = pageMetadata.value.title;
		} else {
			document.title = `${pageMetadata.value.title} | ${instanceName}`;
		}
	}
});
provideReactiveMetadata(pageMetadata);

const menuIndicated = computed(() => {
	for (const def in navbarItemDef) {
		if (def === 'notifications') continue; // 通知は下にボタンとして表示されてるから
		if (navbarItemDef[def].indicated) return true;
	}
	return false;
});

const drawerMenuShowing = ref(false);

mainRouter.on('change', () => {
	drawerMenuShowing.value = false;
});

if (window.innerWidth > 1024) {
	const tempUI = miLocalStorage.getItem('ui_temp');
	if (tempUI) {
		miLocalStorage.setItem('ui', tempUI);
		miLocalStorage.removeItem('ui_temp');
		location.reload();
	}
}

defaultStore.loaded.then(() => {
	if (defaultStore.state.widgets.length === 0) {
		defaultStore.set('widgets', [{
			name: 'calendar',
			id: 'a', place: 'right', data: {},
		}, {
			name: 'notifications',
			id: 'b', place: 'right', data: {},
		}, {
			name: 'trends',
			id: 'c', place: 'right', data: {},
		}]);
	}
});

onMounted(() => {
	if (!isDesktop.value) {
		window.addEventListener('resize', () => {
			if (window.innerWidth >= DESKTOP_THRESHOLD) isDesktop.value = true;
		}, { passive: true });
	}
});

const onContextmenu = (ev) => {
	if (isLink(ev.target)) return;
	if (['INPUT', 'TEXTAREA', 'IMG', 'VIDEO', 'CANVAS'].includes(ev.target.tagName) || ev.target.attributes['contenteditable']) return;
	if (window.getSelection()?.toString() !== '') return;
	const path = mainRouter.getCurrentPath();
	os.contextMenu([{
		type: 'label',
		text: path,
	}, {
		icon: 'ti ti-window-maximize',
		text: i18n.ts.openInWindow,
		action: () => {
			os.pageWindow(path);
		},
	}], ev);
};

function top() {
	contents.value.rootEl.scrollTo({
		top: 0,
		behavior: 'smooth',
	});
}

const navFooterHeight = ref(0);
provide<Ref<number>>(CURRENT_STICKY_BOTTOM, navFooterHeight);

watch(navFooter, () => {
	if (navFooter.value) {
		navFooterHeight.value = navFooter.value.offsetHeight;
		document.body.style.setProperty('--MI-stickyBottom', `${navFooterHeight.value}px`);
		document.body.style.setProperty('--MI-minBottomSpacing', 'var(--MI-minBottomSpacingMobile)');
	} else {
		navFooterHeight.value = 0;
		document.body.style.setProperty('--MI-stickyBottom', '0px');
		document.body.style.setProperty('--MI-minBottomSpacing', '0px');
	}
}, {
	immediate: true,
});

useScrollPositionManager(() => contents.value.rootEl, mainRouter);

const headerActions = computed(() => [{
	icon: 'ti ti-settings',
	text: i18n.ts.settings,
	handler: () => {
		mainRouter.push('/settings/zen');
	},
}]);
</script>

<style>
html,
body {
	width: 100%;
	height: 100%;
	overflow: clip;
	position: fixed;
	top: 0;
	left: 0;
	overscroll-behavior: none;
}

#misskey_app {
	width: 100%;
	height: 100%;
	overflow: clip;
	position: absolute;
	top: 0;
	left: 0;
}
</style>

<style lang="scss" module>
$ui-font-size: 1em; // TODO: どこかに集約したい
$widgets-hide-threshold: 1090px;

.transition_menuDrawerBg_enterActive,
.transition_menuDrawerBg_leaveActive {
	opacity: 1;
	transition: opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.transition_menuDrawerBg_enterFrom,
.transition_menuDrawerBg_leaveTo {
	opacity: 0;
}

.transition_menuDrawer_enterActive,
.transition_menuDrawer_leaveActive {
	opacity: 1;
	transform: translateX(0);
	transition: transform 300ms cubic-bezier(0.23, 1, 0.32, 1), opacity 300ms cubic-bezier(0.23, 1, 0.32, 1);
}
.transition_menuDrawer_enterFrom,
.transition_menuDrawer_leaveTo {
	opacity: 0;
	transform: translateX(-240px);
}

.root {
	height: 100dvh;
	overflow: clip;
	contain: strict;
	box-sizing: border-box;
	display: flex;
}

.sidebar {
	border-right: solid 0.5px var(--MI_THEME-divider);
}

.contents {
	flex: 1;
	height: 100%;
	min-width: 0;
	overflow: auto;
	overflow-y: scroll;
	overscroll-behavior: contain;
	background: var(--MI_THEME-bg);
}

.nav {
	position: fixed;
	z-index: 1000;
	bottom: 0;
	left: 0;
	padding: 12px 12px max(12px, env(safe-area-inset-bottom, 0px)) 12px;
	display: flex;
	justify-content: space-between;
	width: 100%;
	box-sizing: border-box;
	-webkit-backdrop-filter: var(--MI-blur, blur(24px));
		backdrop-filter: var(--MI-blur, blur(24px));
	background-color: var(--MI_THEME-header);
	border-top: solid 0.5px var(--MI_THEME-divider);
}

.navButton {
	position: relative;
	padding: 0;
	aspect-ratio: 1;
	width: 100%;
	max-width: 60px;
	margin: auto;
	border-radius: 100%;
	background: var(--MI_THEME-panel);
	color: var(--MI_THEME-fg);

	&:hover {
		background: var(--MI_THEME-panelHighlight);
	}

	&:active {
		background: hsl(from var(--MI_THEME-panel) h s calc(l - 2));
	}
}

.postButton {
	composes: navButton;
	background: linear-gradient(90deg, var(--MI_THEME-buttonGradateA), var(--MI_THEME-buttonGradateB));
	color: var(--MI_THEME-fgOnAccent);

	&:hover {
		background: linear-gradient(90deg, hsl(from var(--MI_THEME-accent) h s calc(l + 5)), hsl(from var(--MI_THEME-accent) h s calc(l + 5)));
	}

	&:active {
		background: linear-gradient(90deg, hsl(from var(--MI_THEME-accent) h s calc(l + 5)), hsl(from var(--MI_THEME-accent) h s calc(l + 5)));
	}
}

.navButtonIcon {
	font-size: 18px;
	vertical-align: middle;
}

.navButtonIndicator {
	position: absolute;
	top: 0;
	left: 0;
	color: var(--MI_THEME-indicator);
	font-size: 16px;

	&:has(.itemIndicateValueIcon) {
		animation: none;
		font-size: 12px;
	}
}

.menuDrawerBg {
	z-index: 1001;
}

.menuDrawer {
	position: fixed;
	top: 0;
	left: 0;
	z-index: 1001;
	height: 100dvh;
	width: 240px;
	box-sizing: border-box;
	contain: strict;
	overflow: auto;
	overscroll-behavior: contain;
	background: var(--MI_THEME-navBg);
}

.statusbars {
	position: sticky;
	top: 0;
	left: 0;
}

.spacer {
	height: calc(var(--MI-minBottomSpacing));
}

.postForm {
	border-radius: var(--MI-radius);
}

.widgets {
	margin-top: var(--MI-margin);
}
</style>
