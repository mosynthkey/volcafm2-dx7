<template>
  <v-app>
    <v-app-bar :elevation="2">
      <v-toolbar-title>
        volca fm2 to DX7 SysEx
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="showInfo = true">
        <v-icon>mdi-information</v-icon>
      </v-btn>
    </v-app-bar>

    <v-dialog v-model="showInfo" max-width="500">
      <v-card>
        <v-card-title>About</v-card-title>
        <v-card-text>
          Version 1.0.0 (2025-02-17)<br>
          Copyright (c) 2025, Masaki Ono. All rights reserved.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn @click="showInfo = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-main>
      <v-container>
        <v-card class="mb-4 pa-4" style="margin: 0 auto;">
          <div class="text-center mb-4">
            <v-card-title v-html="currentStatusAsText"></v-card-title>
          </div>
          <v-row justify="center" align="center">
            <v-col cols="auto">
              <v-btn v-if="midiStore.connectionState === MIDIConnectionState.NOT_FOUND"
                @click="midiStore.detectVolcaFM2">
                {{ buttonTexts.detect }}
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn
                v-if="midiStore.connectionState === MIDIConnectionState.DETECTED || midiStore.connectionState === MIDIConnectionState.RECEIVED"
                @click="midiStore.requestProgramDump"> {{ buttonTexts.receive }}
              </v-btn>
            </v-col>
            <v-col cols="auto">
              <v-progress-circular
                v-if="midiStore.connectionState === MIDIConnectionState.RECEIVING || midiStore.connectionState === MIDIConnectionState.SEARCHING"
                indeterminate color="#CEB393" class="ml-2"></v-progress-circular>
            </v-col>
          </v-row>
        </v-card>

        <div
          v-if="midiStore.connectionState === MIDIConnectionState.DETECTED || midiStore.connectionState === MIDIConnectionState.RECEIVING || midiStore.connectionState === MIDIConnectionState.RECEIVED">
          <v-divider class="my-4" />

          <v-card v-for="(cartridge, index) in 2" :key="index" class="mb-4 pa-4" style="margin: 0 auto;">
            <v-row align="center">
              <v-col>
                <v-card-title>Cartridge {{ index + 1 }}</v-card-title>
              </v-col>
              <v-col class="text-right">
                <v-btn @click="midiStore.downloadSysEx(index === 0)"
                  :disabled="midiStore.connectionState !== MIDIConnectionState.RECEIVED"
                  :class="{ dimmed: midiStore.connectionState !== MIDIConnectionState.RECEIVED }">
                  {{ buttonTexts.download }}
                  <v-icon>mdi-download</v-icon>
                </v-btn>
              </v-col>
            </v-row>
            <v-divider class="my-4" />
            <v-row v-for="row in 4" :key="row">
              <v-col v-for="col in 8" :key="col" class="text-left"
                :class="{ 'dimmed-text': !midiStore.programNames[(index * 32) + (row - 1) * 8 + (col - 1)]?.name }">
                {{ (index * 32) + (row - 1) * 8 + (col - 1) }}:<br>
                {{ midiStore.programNames[(index * 32) + (row - 1) * 8 + (col - 1)]?.name || '-' }}
              </v-col>
            </v-row>
          </v-card>
        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useMidiStore, MIDIConnectionState } from './stores/midiStore';

const midiStore = useMidiStore();
const showInfo = ref(false);

onMounted(() => {
  midiStore.initMIDI();
});

const userLanguage = navigator.language.startsWith('ja') ? 'ja' : 'en';

const CONNECTION_MESSAGES = {
  ja: {
    [MIDIConnectionState.INITIALIZING]: 'MIDIを初期化中...',
    [MIDIConnectionState.SEARCHING]: 'volca fm2を検索中...',
    [MIDIConnectionState.NOT_FOUND]: 'volca fm2が見つかりません。<br>1. mac/PCと繋がっているMIDIインターフェースにvolca fm2のMIDI IN/OUTを両方接続してください。<br>2. Chromeブラウザから本アプリにアクセスしてください。<br>3. MIDI接続の許可ダイアログが表示されますので、許可を選択してください。',
    [MIDIConnectionState.DETECTED]: 'volca fm2が検出されました。',
    [MIDIConnectionState.RECEIVING]: 'プログラムを受信中...',
    [MIDIConnectionState.RECEIVED]: 'すべてのプログラムを受信しました！',
    [MIDIConnectionState.ERROR]: 'MIDIエラーが発生しました。接続を確認してください。',
  },
  en: {
    [MIDIConnectionState.INITIALIZING]: 'Initializing MIDI...',
    [MIDIConnectionState.SEARCHING]: 'Searching for volca fm2...',
    [MIDIConnectionState.NOT_FOUND]: 'volca fm2 not found.<br>1. Connect both MIDI IN/OUT of volca fm2 to the MIDI interface connected to your mac/PC.<br>2. Access this app from the Chrome browser.<br>3. A MIDI connection permission dialog will appear, please select allow.',
    [MIDIConnectionState.DETECTED]: 'volca fm2 detected.',
    [MIDIConnectionState.RECEIVING]: 'Receiving programs...',
    [MIDIConnectionState.RECEIVED]: 'All programs received!',
    [MIDIConnectionState.ERROR]: 'MIDI error occurred. Please check your connection.',
  }
};

const BUTTON_TEXTS = {
  ja: {
    detect: 'volca fm2を検出',
    receive: 'プログラムを受信',
    download: 'ダウンロード',
    close: '閉じる'
  },
  en: {
    detect: 'Detect volca fm2',
    receive: 'Receive all programs',
    download: 'Download',
    close: 'Close'
  }
};

const currentStatusAsText = computed(() => {
  return CONNECTION_MESSAGES[userLanguage][midiStore.connectionState];
});

const buttonTexts = computed(() => {
  return BUTTON_TEXTS[userLanguage];
});
</script>

<style scoped>
.v-app-bar {
  background-color: #382B2D;
  color: #CEB393;
}

.v-application {
  background-color: #382B2D;
  color: #CEB393;
}

.v-card {
  color: #CEB393;
}

.v-app-bar :deep(.v-btn) {
  color: #CEB393;
}

.v-main :deep(.v-btn) {
  background-color: #CEB393;
  color: #382B2D;
}

.v-btn.dimmed {
  opacity: 0.5;
  pointer-events: none;
}

.mb-4 {
  margin-bottom: 16px;
}

.pa-4 {
  padding: 16px;
}

.v-toolbar-title {
  color: #CEB393;
  font-weight: bold;
}

.dimmed-text {
  opacity: 0.5;
}
</style>
