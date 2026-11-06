import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {MonaLisa} from './MonaLisa';
registerRoot(() => <Composition id="MonaLisa" component={MonaLisa} durationInFrames={960} fps={30} width={1920} height={1080} />);
