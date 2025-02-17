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
        <v-card-title>About volca fm2 to DX7 SysEx</v-card-title>
        <v-card-text>
          Version 1.0.0. (2025-02-17)<br>
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
        <v-card class="mb-4 pa-4" max-width="1200" style="margin: 0 auto;">
          <div class="text-center mb-4">
            <v-card-title>
              {{ currentStatusAsText }}

            </v-card-title>
          </div>
          <v-row justify="center" align="center">
            <v-col cols="auto">
              <v-btn v-if="midiStore.connectionState === MIDIConnectionState.NOT_FOUND" class="info-btn"
                @click="midiStore.detectVolcaFM2">Detect volca fm2</v-btn>
            </v-col>
            <v-col cols="auto">
              <v-btn
                v-if="midiStore.connectionState === MIDIConnectionState.DETECTED || midiStore.connectionState === MIDIConnectionState.RECEIVED"
                @click="midiStore.requestProgramDump">Receive Programs</v-btn>
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

          <v-card v-for="(cartridge, index) in 2" :key="index" class="mb-4 pa-4" max-width="1200" style="margin: 0 auto;">
            <v-row align="center">
              <v-col>
                <v-card-title>Cartridge {{ index + 1 }}</v-card-title>
              </v-col>
              <v-col class="text-right">
                <v-btn @click="midiStore.downloadSysEx(index === 0)"
                  :disabled="midiStore.connectionState !== MIDIConnectionState.RECEIVED"
                  :class="{ dimmed: midiStore.connectionState !== MIDIConnectionState.RECEIVED }">
                  Download
                  <v-icon>mdi-download</v-icon>
                </v-btn>
              </v-col>
            </v-row>
            <v-divider class="my-4" />
            <v-row v-for="row in 4" :key="row" class="mb-2">
              <v-col v-for="col in 8" :key="col" class="text-left"
                :class="{ 'dimmed-text': !midiStore.programNames[(index * 32) + (row - 1) * 8 + (col - 1)]?.name }">
                {{ (index * 32) + (row - 1) * 8 + (col - 1) }}:
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

const currentStatusAsText = computed(() => {
  const CONNECTION_MESSAGES = {
    [MIDIConnectionState.INITIALIZING]: 'Initializing MIDI...',
    [MIDIConnectionState.SEARCHING]: 'Searching for volca fm2...',
    [MIDIConnectionState.NOT_FOUND]: 'volca fm2 not found. Please connect and click the detect button.',
    [MIDIConnectionState.DETECTED]: 'volca fm2 detected!',
    [MIDIConnectionState.RECEIVING]: 'Receiving programs...',
    [MIDIConnectionState.RECEIVED]: 'All programs received!',
    [MIDIConnectionState.ERROR]: 'MIDI error occurred. Please check your connection.',
  } as const;
  return CONNECTION_MESSAGES[midiStore.connectionState];
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

.info-btn {
  color: #382B2D;
  text-color: #382B2D;
}
</style>
