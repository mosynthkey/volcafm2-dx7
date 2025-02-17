import { defineStore } from 'pinia';
import { ref } from 'vue';

type MIDIAccess = globalThis.MIDIAccess;
type MIDIInput = globalThis.MIDIInput;
type MIDIOutput = globalThis.MIDIOutput;
type MIDIMessageEvent = globalThis.MIDIMessageEvent;

export enum MIDIConnectionState {
    INITIALIZING,   
    SEARCHING,
    NOT_FOUND,
    DETECTED,
    RECEIVING,
    RECEIVED,
    ERROR
}

export const useMidiStore = defineStore('midi', () => {
    const connectionState = ref<MIDIConnectionState>(MIDIConnectionState.INITIALIZING);
    const midiAccess = ref<MIDIAccess | null>(null);
    const midiInputs = ref<string[]>([]);
    const midiOutputs = ref<string[]>([]);
    const selectedMidiIn = ref<string | null>(null);
    const selectedMidiOut = ref<string | null>(null);
    const programNames = ref<{ name: string }[]>(Array.from({ length: 64 }, () => ({ name: '' })));
    const programData = ref<Uint8Array[]>([]);

    const VOLCA_FM2_ID = {
        MANUFACTURER: 0x42,    // KORG
        FAMILY_LSB: 0x2F,     // volca fm ID
        FAMILY_MSB: 0x01,
        MEMBER_LSB: 0x08,     // 2nd generation ID
        MEMBER_MSB: 0x00
    };

    const initMIDI = async () => {
        try {
            const access = await navigator.requestMIDIAccess({ sysex: true });
            midiAccess.value = access;
            midiInputs.value = Array.from(access.inputs.values())
                .map(input => input.name ?? '')
                .filter(Boolean);
            midiOutputs.value = Array.from(access.outputs.values())
                .map(output => output.name ?? '')
                .filter(Boolean);

            access.inputs.forEach(input => {
                input.onmidimessage = (event: MIDIMessageEvent) => {
                    if (event.data) {
                        processMIDIMessage(event, input, access);
                    }
                };
            });
            detectVolcaFM2();
        } catch (err) {
            connectionState.value = MIDIConnectionState.ERROR;
        }
    };

    const processMIDIMessage = (
        event: MIDIMessageEvent,
        input: MIDIInput,
        midiAccess: MIDIAccess
    ) => {
        if (!event.data) return;

        if (event.data[0] === 0xF0) {
            if (isVolcaFM2Reply(event.data)) {
                const outputId = findMatchingOutputPort(input.name ?? '');
                if (outputId) {
                    selectedMidiIn.value = input.name;
                    selectedMidiOut.value = midiAccess.outputs.get(outputId)?.name ?? null;
                    connectionState.value = MIDIConnectionState.DETECTED;
                }
            } else if (isVolcaFM2Dump(event.data)) {
                connectionState.value = MIDIConnectionState.RECEIVING;
                const programNo = event.data[7];
                const programDataArray = processVolcaDump(event.data.slice(8, -1));
                const programName = String.fromCharCode(...programDataArray.slice(118, 127));
                programNames.value[programNo] = { name: programName };
                programData.value[programNo] = programDataArray;
                if (programNo === 63) {
                    connectionState.value = MIDIConnectionState.RECEIVED;
                }
            }
        }
    };

    const detectVolcaFM2 = async () => {
        connectionState.value = MIDIConnectionState.SEARCHING;

        midiAccess.value?.outputs.forEach((output: MIDIOutput) => {
            const DEVICE_INQUIRY = [0xF0, 0x7E, 0x7F, 0x06, 0x01, 0xF7];
            output.send(new Uint8Array(DEVICE_INQUIRY));
        });

        setTimeout(() => {
            if (connectionState.value === MIDIConnectionState.SEARCHING) {
                connectionState.value = MIDIConnectionState.NOT_FOUND;
            }
        }, 2000);
    };

    const isVolcaFM2Reply = (data: Uint8Array) => {
        return (
            data[5] === VOLCA_FM2_ID.MANUFACTURER &&
            data[6] === VOLCA_FM2_ID.FAMILY_LSB &&
            data[7] === VOLCA_FM2_ID.FAMILY_MSB &&
            data[8] === VOLCA_FM2_ID.MEMBER_LSB &&
            data[9] === VOLCA_FM2_ID.MEMBER_MSB
        );
    };

    const isVolcaFM2Dump = (data: Uint8Array) => {
        return (
            data[1] === VOLCA_FM2_ID.MANUFACTURER &&
            data[2] === 0x30 &&
            data[3] === 0x00 &&
            data[4] === VOLCA_FM2_ID.FAMILY_MSB &&
            data[5] === VOLCA_FM2_ID.FAMILY_LSB &&
            data[6] === 0x4E
        );
    };

    const findMatchingOutputPort = (inputName: string) => {
        if (!midiAccess.value) return null;
        for (const [id, output] of midiAccess.value.outputs.entries()) {
            if (output.name === inputName) {
                return id;
            }
        }
        return null;
    };

    const requestProgramDump = async () => {
        reset();
        if (!selectedMidiOut.value || !midiAccess.value) return;

        const output = Array.from(midiAccess.value.outputs.values())
            .find((output: MIDIOutput) => output.name === selectedMidiOut.value);

        if (!output) {
            connectionState.value = MIDIConnectionState.ERROR;
            return;
        }

        let DUMP_REQUEST = [0xF0, 0x42, 0x30, 0x00, 0x01, 0x2F, 0x1E, 0x00, 0xF7];
        for (let i = 0; i < 64; i++) {
            DUMP_REQUEST[7] = i;
            output.send(new Uint8Array(DUMP_REQUEST));
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    };

    const processVolcaDump = (data: Uint8Array) => {
        const unpackedData: Uint8Array = new Uint8Array(128);
        let r = 0, w = 0; // read, write index

        while (r < data.length) {
            unpackedData[w + 0] = data[r + 1] | (((data[r + 0] >> 0) & 1) << 7);
            unpackedData[w + 1] = data[r + 2] | (((data[r + 0] >> 1) & 1) << 7);
            unpackedData[w + 2] = data[r + 3] | (((data[r + 0] >> 2) & 1) << 7);
            unpackedData[w + 3] = data[r + 4] | (((data[r + 0] >> 3) & 1) << 7);
            unpackedData[w + 4] = data[r + 5] | (((data[r + 0] >> 4) & 1) << 7);
            unpackedData[w + 5] = data[r + 6] | (((data[r + 0] >> 5) & 1) << 7);
            unpackedData[w + 6] = data[r + 7] | (((data[r + 0] >> 6) & 1) << 7);
            r += 8;
            w += 7;
        }

        return unpackedData.slice(0, 128);
    }

    const downloadSysEx = (isFirst: boolean) => {
        const dx7Header = [0xF0, 0x43, 0x00, 0x09, 0x20, 0x00];
        const dx7Footer = [0x00, 0xF7];

        const allVoicesData = isFirst
            ? programData.value.slice(0, 32).reduce<number[]>((acc, val) => acc.concat(Array.from(val)), [])
            : programData.value.slice(32, 64).reduce<number[]>((acc, val) => acc.concat(Array.from(val)), []);

        const checksum = (0x100 - allVoicesData.reduce((acc, val) => (acc + val) & 0xFF, 0)) & 0x7F;
        dx7Footer[0] = checksum;

        const dx7CartridgeData = [...dx7Header, ...allVoicesData, ...dx7Footer];
        const blob = new Blob([new Uint8Array(dx7CartridgeData)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = isFirst ? 'volca_fm2_dx7_cartridge_1.syx' : 'volca_fm2_dx7_cartridge_2.syx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const reset = () => {
        programNames.value = Array.from({ length: 64 }, () => ({ name: '' }));
        programData.value = [];
    }

    return {
        connectionState,
        MIDIConnectionState,
        midiInputs,
        midiOutputs,
        selectedMidiIn,
        selectedMidiOut,
        programNames,
        initMIDI,
        detectVolcaFM2,
        requestProgramDump,
        downloadSysEx,
        reset
    };
});