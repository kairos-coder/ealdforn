// chapel-actions.js
// Handlers for every interactive zone in the Coal Chapel

const CHAPEL_ACTIONS = {
    tendFire(state) {
        const timber = state.playerResources?.Timber || 0;
        if (timber < 1) {
            return { success: false, toast: 'No timber to feed the fire. The Silent Brother watches you, expressionless.' };
        }
        state.playerResources.Timber -= 1;
        state.morale = Math.min(100, state.morale + 5);
        state.faith = Math.min(100, state.faith + 5);
        
        let extraToast = '';
        if (!state.silentBrotherSpoke && state.ice > 50 && state.faith > 50 && Math.random() < 0.35) {
            state.silentBrotherSpoke = true;
            state.faith = Math.min(100, state.faith + 15);
            extraToast = '\n\n🧘 The Silent Brother opens his mouth. One word: "Threshold." Then silence resumes. Faith +15.';
        }
        
        return {
            success: true,
            toast: '🔥 You place timber on the Ātravan Coal. The flames rise. Faith +5, Morale +5.' + extraToast,
            particles: { type: 'embers', count: 20 },
        };
    },

    observeBrother(state) {
        state.faith = Math.min(100, state.faith + 2);
        const spoken = state.silentBrotherSpoke;
        const lines = spoken ? [
            'He has not spoken since that day. But his presence is heavier now — as if the one word emptied something.',
            'The eighty-seventh keeper. His silence is a kind of tending, too.',
            'You watch him. He watches the Coal. The Coal watches nothing. That is the order of things.',
        ] : [
            'He kneels. He has always knelt. The eighty-seventh of his line. He has never spoken. The fire has never gone out.',
            'His hood does not turn. He tends the Coal. That is all. That is everything.',
            'You stand near him. The air is warmer here. He does not acknowledge you. He does not need to.',
        ];
        return { success: true, toast: lines[Math.floor(Math.random() * lines.length)] };
    },

    takeWood(state) {
        const timber = state.playerResources?.Timber || 0;
        if (timber > 0) {
            state.playerResources.Timber -= 1;
            return { success: true, toast: `🪵 You take one Timber from the stack. ${state.playerResources.Timber} remaining.` };
        }
        return { success: false, toast: 'The wood stack is empty. Only dust and splinters remain.' };
    },

    studyNiche(state) {
        state.tabletFragments = Math.min(7, (state.tabletFragments || 0) + 1);
        const GLYPHS = ['𐤀','𐤁','𐤂','𐤃','𐤄','𐤅','𐤆','𐤇','𐤈','𐤉','𐤊','𐤋','𐤌','𐤍','𐤎','𐤏','𐤐','𐤑','𐤒','𐤓','𐤔','𐤕'];
        const g = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        state.faith = Math.min(100, state.faith + 3);
        
        let extra = '';
        if (state.tabletFragments >= 7) {
            extra = '\n\n✨ The fragments align. The Seventh Tablet begins to write itself.';
        }
        return { success: true, toast: `📜 You study a fragment. A glyph catches the firelight: ${g} — ${state.tabletFragments}/7 fragments.` + extra };
    },

    lookOutWindow(state) {
        const ice = state.ice;
        const seasons = ['Spring','Summer','Autumn','Winter'];
        const season = seasons[state.season];
        let desc = '';
        if (ice < 30) desc = `The fjord glitters in ${season.toLowerCase()} light. Dark water. Ships could still pass.`;
        else if (ice < 60) desc = `Ice fingers reach across the fjord. ${season} cold bites the glass.`;
        else if (ice < 85) desc = 'The fjord is mostly white. Ice sheets groan. No ships.';
        else desc = 'The fjord is sealed. A white plain where water once was.';
        
        return { success: true, toast: `🪟 ${desc} Ice: ${ice}%.` };
    },

    leaveChapel(state) {
        return {
            success: true,
            toast: '🚶 You bow to the Coal and step backward through the door...',
            navigate: 'index.html?from=chapel',
        };
    },

    silentPrayer(state) {
        state.faith = Math.min(100, state.faith + 1);
        const lines = [
            'You offer a silent prayer. The Coal pulses — once — as if acknowledging.',
            'You close your eyes. When you open them, the embers have rearranged.',
            'The prayer leaves your lips without sound. The Silent Brother shifts — barely.',
        ];
        return {
            success: true,
            toast: lines[Math.floor(Math.random() * lines.length)],
            particles: { type: 'sparks', count: 5 },
        };
    },
};
