// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {MonaLisa} from './MonaLisa';
// @ts-ignore
import {DURATION, FPS, W, H} from './timeline.mjs';

const Root: React.FC = () => (
  <Composition id="MonaLisa" component={MonaLisa} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
);
registerRoot(Root);
