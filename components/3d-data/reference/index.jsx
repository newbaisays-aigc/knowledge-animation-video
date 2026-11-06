// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
import React, { useEffect, useRef, useState } from 'react';
import { AbsoluteFill, Audio, Composition, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig, registerRoot } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useFrame, useThree } from '@react-three/fiber';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { buildWorld, TOTAL } from './scene.js';

const FPS = 30;

function useFont() {
  const [font, setFont] = useState(null);
  const [handle] = useState(() => delayRender('load font'));
  useEffect(() => { fetch(staticFile('font.json')).then(r => r.json()).then(j => { setFont(new FontLoader().parse(j)); continueRender(handle); }); }, [handle]);
  return font;
}

function World({ font }) {
  const { gl } = useThree();
  const { width, height } = useVideoConfig();
  const frame = useCurrentFrame();
  const frameRef = useRef(frame); frameRef.current = frame;
  const renderRef = useRef(null);
  if (!renderRef.current) renderRef.current = buildWorld({ gl, font, W: width, H: height });
  useFrame(() => renderRef.current(frameRef.current / FPS), 1);
  return null;
}

const Video = () => {
  const { width, height } = useVideoConfig();
  const font = useFont();
  return (
    <AbsoluteFill style={{ backgroundColor: '#01040b' }}>
      {font && (
        <ThreeCanvas width={width} height={height} gl={{ antialias: false, preserveDrawingBuffer: true }} linear={false} flat>
          <World font={font} />
        </ThreeCanvas>
      )}
      <Audio src={staticFile('audio.wav')} />
    </AbsoluteFill>
  );
};

registerRoot(() => <Composition id="SpaceX" component={Video} durationInFrames={Math.round(TOTAL * FPS)} fps={FPS} width={1920} height={1080} />);
