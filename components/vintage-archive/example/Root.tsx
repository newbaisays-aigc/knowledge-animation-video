// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {Napoleon} from './Napoleon';
import data from './cues.json';
const Root: React.FC = () => <Composition id="Napoleon" component={Napoleon} width={1920} height={1080} fps={30} durationInFrames={Math.ceil(data.total * 30)} />;
registerRoot(Root);
