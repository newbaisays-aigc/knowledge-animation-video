import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Napoleon} from './Napoleon';
import data from './cues.json';
const Root: React.FC = () => <Composition id="Napoleon" component={Napoleon} width={1920} height={1080} fps={30} durationInFrames={Math.ceil(data.total * 30)} />;
registerRoot(Root);
