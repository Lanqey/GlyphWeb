(function() {
    'use strict';

    const NS = 'http://www.w3.org/2000/svg';
    const CX = 250;
    const CY = 250;

    const ORBITS = [{
            rx: 90,
            ry: 78,
            tilt: -18,
            speed: 1.05,
            rev: false,
            plR: 6,
            plFill: 'pl1',
            startA: 0.4,
            wobAmp: 11,
            wobDur: 5
        },
        {
            rx: 132,
            ry: 102,
            tilt: 38,
            speed: 0.72,
            rev: true,
            plR: 7.5,
            plFill: 'pl2',
            startA: 2.1,
            wobAmp: 12.5,
            wobDur: 7
        },
        {
            rx: 168,
            ry: 126,
            tilt: -58,
            speed: 0.50,
            rev: false,
            plR: 6.5,
            plFill: 'pl3',
            startA: 4.0,
            wobAmp: 12,
            wobDur: 9
        },
        {
            rx: 202,
            ry: 148,
            tilt: 18,
            speed: 0.34,
            rev: true,
            plR: 8.5,
            plFill: 'pl4',
            startA: 5.2,
            wobAmp: 10.5,
            wobDur: 11
        },
        {
            rx: 234,
            ry: 172,
            tilt: 72,
            speed: 0.22,
            rev: false,
            plR: 5.5,
            plFill: 'pl5',
            startA: 1.3,
            wobAmp: 13,
            wobDur: 13
        }
    ];

    const DEFS = `
        <radialGradient id="galCore" cx="38%" cy="36%" r="72%">
            <stop offset="0%"   stop-color="#ffffff"/>
            <stop offset="8%"   stop-color="#fffbe0"/>
            <stop offset="25%"  stop-color="#f8db9c"/>
            <stop offset="52%"  stop-color="#e8bc68"/>
            <stop offset="80%"  stop-color="#c89838"/>
            <stop offset="100%" stop-color="#5a4410"/>
        </radialGradient>
        <radialGradient id="galCorona" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="#fff8d0" stop-opacity="0.95"/>
            <stop offset="30%"  stop-color="#f4cf80" stop-opacity="0.45"/>
            <stop offset="65%"  stop-color="#d4a84e" stop-opacity="0.12"/>
            <stop offset="100%" stop-color="#d4a84e" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="galHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stop-color="#f4cf80" stop-opacity="0.22"/>
            <stop offset="45%"  stop-color="#d4a84e" stop-opacity="0.06"/>
            <stop offset="100%" stop-color="#d4a84e" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="pl1" cx="34%" cy="30%" r="76%">
            <stop offset="0%"   stop-color="#fff0d0"/>
            <stop offset="25%"  stop-color="#ffc878"/>
            <stop offset="60%"  stop-color="#e88030"/>
            <stop offset="100%" stop-color="#2a0804"/>
        </radialGradient>
        <radialGradient id="pl2" cx="34%" cy="30%" r="76%">
            <stop offset="0%"   stop-color="#e0f0f8"/>
            <stop offset="25%"  stop-color="#88b8d0"/>
            <stop offset="60%"  stop-color="#1a4870"/>
            <stop offset="100%" stop-color="#040a18"/>
        </radialGradient>
        <radialGradient id="pl3" cx="34%" cy="30%" r="76%">
            <stop offset="0%"   stop-color="#f0e0f8"/>
            <stop offset="25%"  stop-color="#c898e0"/>
            <stop offset="60%"  stop-color="#5a2890"/>
            <stop offset="100%" stop-color="#0e0420"/>
        </radialGradient>
        <radialGradient id="pl4" cx="34%" cy="30%" r="76%">
            <stop offset="0%"   stop-color="#ffffff"/>
            <stop offset="25%"  stop-color="#d8e8f4"/>
            <stop offset="60%"  stop-color="#406890"/>
            <stop offset="100%" stop-color="#040a14"/>
        </radialGradient>
        <radialGradient id="pl5" cx="34%" cy="30%" r="76%">
            <stop offset="0%"   stop-color="#f8e0a8"/>
            <stop offset="25%"  stop-color="#d0a050"/>
            <stop offset="60%"  stop-color="#602e10"/>
            <stop offset="100%" stop-color="#100402"/>
        </radialGradient>
    `;

    function el(name, attrs) {
        const node = document.createElementNS(NS, name);
        if (attrs) {
            for (const k in attrs) node.setAttribute(k, attrs[k]);
        }
        return node;
    }

    function build(svg, options) {
        const opts = options || {};
        const reducedMotion = !!opts.reducedMotion;

        if (!svg) return {
            destroy() {}
        };
        while (svg.firstChild) svg.removeChild(svg.firstChild);

        // defs
        const defs = el('defs');
        defs.innerHTML = DEFS;
        svg.appendChild(defs);

        // 外层光晕
        svg.appendChild(el('circle', {
            cx: CX,
            cy: CY,
            r: 230,
            fill: 'url(#galHalo)'
        }));

        // 轨道 + 行星
        const planetNodes = [];

        ORBITS.forEach(o => {
            const wobbleG = el('g');
            const tiltG = el('g', {
                transform: `rotate(${o.tilt} ${CX} ${CY})`
            });

            // 轨道（两条：细描边 + 外发光）
            tiltG.appendChild(el('ellipse', {
                cx: CX,
                cy: CY,
                rx: o.rx,
                ry: o.ry,
                stroke: '#d4a84e',
                'stroke-width': 0.7,
                opacity: 0.5,
                fill: 'none'
            }));
            tiltG.appendChild(el('ellipse', {
                cx: CX,
                cy: CY,
                rx: o.rx,
                ry: o.ry,
                stroke: '#f4cf80',
                'stroke-width': 1.8,
                opacity: 0.1,
                fill: 'none'
            }));

            // 行星组
            const pg = el('g');
            pg.appendChild(el('circle', {
                cx: 0,
                cy: 0,
                r: o.plR * 3,
                fill: '#f4cf80',
                opacity: 0.1
            }));
            pg.appendChild(el('circle', {
                cx: 0,
                cy: 0,
                r: o.plR,
                fill: `url(#${o.plFill})`
            }));
            pg.appendChild(el('circle', {
                cx: (-o.plR * 0.3).toFixed(2),
                cy: (-o.plR * 0.32).toFixed(2),
                r: (o.plR * 0.3).toFixed(2),
                fill: '#ffffff',
                opacity: 0.75
            }));

            tiltG.appendChild(pg);
            wobbleG.appendChild(tiltG);
            svg.appendChild(wobbleG);

            planetNodes.push({
                o,
                wobbleG,
                pg
            });
        });

        // 中心恒星
        const coreG = el('g');
        const corona = el('circle', {
            cx: CX,
            cy: CY,
            r: 90,
            fill: 'url(#galCorona)'
        });
        const star = el('circle', {
            cx: CX,
            cy: CY,
            r: 34,
            fill: 'url(#galCore)'
        });
        const starRim = el('circle', {
            cx: CX,
            cy: CY,
            r: 34,
            stroke: '#ffe9a8',
            'stroke-width': 0.6,
            opacity: 0.55,
            fill: 'none'
        });
        const starHL = el('circle', {
            cx: CX - 10,
            cy: CY - 12,
            r: 7,
            fill: '#ffffff',
            opacity: 0.88
        });
        const starDot = el('circle', {
            cx: CX,
            cy: CY,
            r: 4,
            fill: '#ffffff',
            opacity: 0.9
        });

        coreG.appendChild(corona);
        coreG.appendChild(star);
        coreG.appendChild(starRim);
        coreG.appendChild(starHL);
        coreG.appendChild(starDot);
        svg.appendChild(coreG);

        // 单条 rAF 循环，一帧写完所有属性
        let rafId = null;
        let alive = true;
        const t0 = performance.now();

        function applyStatic() {
            planetNodes.forEach(({
                o,
                pg
            }) => {
                const x = CX + Math.cos(o.startA) * o.rx;
                const y = CY + Math.sin(o.startA) * o.ry;
                pg.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
            });
        }

        function frame(now) {
            if (!alive) return;
            const t = (now - t0) / 1000;

            for (let i = 0; i < planetNodes.length; i++) {
                const item = planetNodes[i];
                const o = item.o;

                // 摆动（等效于原 SMIL 的 keyframes 正弦曲线）
                const wobbleAngle = Math.sin((t / o.wobDur) * Math.PI * 2) * o.wobAmp;
                item.wobbleG.setAttribute(
                    'transform',
                    `rotate(${wobbleAngle.toFixed(2)} ${CX} ${CY})`
                );

                // 公转
                const dir = o.rev ? -1 : 1;
                const angle = o.startA + t * o.speed * dir;
                const x = CX + Math.cos(angle) * o.rx;
                const y = CY + Math.sin(angle) * o.ry;
                item.pg.setAttribute(
                    'transform',
                    `translate(${x.toFixed(2)} ${y.toFixed(2)})`
                );
            }

            // 核心呼吸（周期 3.5s，振幅与原 SMIL 一致）
            const breath = Math.sin((t * Math.PI * 2) / 3.5);
            const k = breath * 0.5 + 0.5; // 0..1
            const r = 33 + k * 3;
            star.setAttribute('r', r.toFixed(2));
            starRim.setAttribute('r', r.toFixed(2));
            corona.setAttribute('r', (88 + k * 8).toFixed(2));

            rafId = requestAnimationFrame(frame);
        }

        if (reducedMotion) {
            applyStatic();
        } else {
            rafId = requestAnimationFrame(frame);
        }

        return {
            destroy() {
                alive = false;
                if (rafId) cancelAnimationFrame(rafId);
            }
        };
    }

    window.GlyphGalaxy = {
        build
    };
})();
