(function() {
    'use strict';

    const cfg = (window.APP_CONFIG && window.APP_CONFIG.audio) || {};
    const WRITE_POOL_SIZE = 6;

    const GlyphAudio = {
        opening: null,
        breathe: null,
        writePool: [],
        writeIdx: 0,

        isStarted: false,
        isBreatheStarted: false,
        _timelineRaf: null,
        _wasPlaying: false,
        _wasBreathe: false,

        onMeteor: null,

        init() {
            this.opening = new Audio();
            this.opening.preload = 'auto';
            this.opening.volume = 1;
            this.opening.src = cfg.opening;

            this.breathe = new Audio();
            this.breathe.preload = 'auto';
            this.breathe.loop = true;
            this.breathe.volume = 0;
            this.breathe.src = cfg.breathe;

            document.addEventListener('visibilitychange', () => {
                if (document.hidden) this.pauseAll();
                else this.resumeAll();
            });

            return this;
        },

        // prime入口
        prime() {
            if (this.isStarted) return Promise.resolve(true);

            const audio = this.opening;
            if (!audio) return Promise.resolve(false);

            // 同步调用 play() 
            let p;
            try {
                audio.currentTime = 0;
                audio.volume = 1;
                p = audio.play();
            } catch (_) {
                return Promise.resolve(false);
            }

            // 同一个手势栈里，预热其他所有音频元素
            this._primeElement(this.breathe);
            this._buildAndPrimeWritePool();

            if (!p || typeof p.then !== 'function') {
                this._onStarted();
                return Promise.resolve(true);
            }

            return p.then(
                () => {
                    this._onStarted();
                    return true;
                },
                () => false
            );
        },

        // 单个元素的预热：play 后立即 pause
        // volume 临时置 0，避免用户听到预热的杂音
        _primeElement(el) {
            if (!el) return;
            try {
                const origVol = el.volume;
                el.volume = 0;
                const pp = el.play();
                if (pp && typeof pp.then === 'function') {
                    pp.then(() => {
                        try {
                            el.pause();
                        } catch (_) {}
                        el.currentTime = 0;
                        el.volume = origVol;
                    }).catch(() => {
                        el.volume = origVol;
                    });
                } else {
                    el.pause();
                    el.currentTime = 0;
                    el.volume = origVol;
                }
            } catch (_) {}
        },

        // 建池 + 逐个预热
        _buildAndPrimeWritePool() {
            if (this.writePool.length) return;
            const src = cfg.write;
            if (!src) return;

            for (let i = 0; i < WRITE_POOL_SIZE; i++) {
                const a = new Audio();
                a.preload = 'auto';
                a.volume = 0;
                a.src = src;

                try {
                    const pp = a.play();
                    if (pp && typeof pp.then === 'function') {
                        pp.then(() => {
                            try {
                                a.pause();
                            } catch (_) {}
                            a.currentTime = 0;
                            a.volume = 0.4;
                        }).catch(() => {
                            a.volume = 0.4;
                        });
                    } else {
                        a.pause();
                        a.currentTime = 0;
                        a.volume = 0.4;
                    }
                } catch (_) {
                    a.volume = 0.4;
                }

                this.writePool.push(a);
            }
        },

        // playWrite —— 循环复用池里的元素
        playWrite() {
            const pool = this.writePool;
            if (!pool.length) return;

            const a = pool[this.writeIdx];
            this.writeIdx = (this.writeIdx + 1) % pool.length;

            try {
                a.currentTime = 0;
                const p = a.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
            } catch (_) {}
        },

        // 启动成功后的处理
        _onStarted() {
            if (this.isStarted) return;
            this.isStarted = true;
            this._startTimeline();
        },

        // 时间轴：以 audio.currentTime 为时钟源
        _startTimeline() {
            const audio = this.opening;
            const METEOR_AT = 6.5;
            const FADE_AT = 7.0;

            let meteorFired = false;
            let fadeFired = false;

            const tick = () => {
                if (!this.isStarted) return;
                const t = audio.currentTime;

                if (!meteorFired && t >= METEOR_AT) {
                    meteorFired = true;
                    if (typeof this.onMeteor === 'function') this.onMeteor();
                }
                if (!fadeFired && t >= FADE_AT) {
                    fadeFired = true;
                    this._fadeOutAndBreathe();
                    return;
                }
                this._timelineRaf = requestAnimationFrame(tick);
            };
            this._timelineRaf = requestAnimationFrame(tick);

            audio.addEventListener('ended', () => this._startBreathe(), {
                once: true
            });
        },

        _fadeOutAndBreathe() {
            const audio = this.opening;
            if (!audio || audio.paused || audio.ended) {
                this._startBreathe();
                return;
            }

            const startVol = audio.volume;
            const t0 = performance.now();
            const DUR = 1000;

            const step = () => {
                const k = Math.min(1, (performance.now() - t0) / DUR);
                audio.volume = Math.max(0, startVol * (1 - k));

                if (k >= 1) {
                    try {
                        audio.pause();
                    } catch (_) {}
                    this._startBreathe();
                    return;
                }
                requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        },

        // 呼吸音(背景音乐）
        _startBreathe() {
            if (this.isBreatheStarted) return;

            const audio = this.breathe;
            if (!audio) return;

            audio.volume = 0;

            let p;
            try {
                p = audio.play();
            } catch (_) {
                return;
            }

            const onOk = () => {
                this.isBreatheStarted = true;

                const TARGET = 0.28;
                const t0 = performance.now();
                const DUR = 1800;

                const fade = () => {
                    const k = Math.min(1, (performance.now() - t0) / DUR);
                    audio.volume = TARGET * k;
                    if (k < 1) requestAnimationFrame(fade);
                };
                requestAnimationFrame(fade);
            };

            if (!p || typeof p.then !== 'function') {
                onOk();
                return;
            }

            p.then(onOk).catch(() => {
                // 罕见情况：等下一次用户手势再试
                const retry = () => {
                    document.removeEventListener('pointerdown', retry, true);
                    document.removeEventListener('touchstart', retry, true);
                    this._startBreathe();
                };
                document.addEventListener('pointerdown', retry, {
                    capture: true,
                    passive: true
                });
                document.addEventListener('touchstart', retry, {
                    capture: true,
                    passive: true
                });
            });
        },

        // 后台挂起 / 恢复
        pauseAll() {
            this._wasPlaying = !!(this.opening && !this.opening.paused);
            this._wasBreathe = !!(this.breathe && !this.breathe.paused);

            if (this.opening) {
                try {
                    this.opening.pause();
                } catch (_) {}
            }
            if (this.breathe) {
                try {
                    this.breathe.pause();
                } catch (_) {}
            }
        },

        resumeAll() {
            if (this._wasPlaying && this.opening) {
                const p = this.opening.play();
                if (p && p.catch) p.catch(() => {});
            }
            if (this._wasBreathe && this.breathe) {
                const p = this.breathe.play();
                if (p && p.catch) p.catch(() => {});
            }
            this._wasPlaying = false;
            this._wasBreathe = false;
        }
    };

    window.GlyphAudio = GlyphAudio;
})();
