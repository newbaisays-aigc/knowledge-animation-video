// Copyright (c) 2026 小白姐姐. MIT License.
// https://github.com/newbaisays-aigc/knowledge-animation-video
import React from 'react';
import {Composition, registerRoot} from 'remotion';
// 放大镜示例：在《加冕礼》相片卡上放大拿破仑举起的皇冠。focus 坐标用 common/scripts/uv_grid.py 读出
import {ArchiveFrame, Drop, PhotoCard, Magnifier, Paper, C, CJK} from '../index';
const S: React.FC = () => (<>
  <Drop at={0} from={[0, 900]} rot={8} endRot={-2} style={{left: 360, top: 160}}><PhotoCard src="coron_aged.jpg" w={960} h={600} pos="50% 50%" caption="Le Sacre · 1804" /></Drop>
  <Magnifier at={20} src="coron_aged.jpg" box={[378, 178, 960, 600]} focus={[0.56, 0.575]} x={1300} y={330} r={190} m={3} />
  <Paper seed="m" style={{left: 1160, top: 560, width: 420, height: 120, transform: 'rotate(4deg)'}}><div style={{fontFamily: CJK, fontWeight: 900, fontSize: 48, color: C.red}}>他亲手加冕</div></Paper>
</>);
const V: React.FC = () => <ArchiveFrame total={3} cues={[]} audio="" scenes={[{el: <S />, end: 3}]} />;
registerRoot(() => <Composition id="Mag" component={V} width={1920} height={1080} fps={30} durationInFrames={90} />);
