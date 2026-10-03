(function() {
    'use strict';

    const cfg = window.APP_CONFIG || {};
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 滚动锁
    let scrollLocked = false;

    function blockScroll(e) {
        if (!scrollLocked) return;
        if (e.cancelable) e.preventDefault();
    }

    function lockScroll() {
        if (scrollLocked) return;
        scrollLocked = true;
        document.documentElement.classList.add('scroll-locked');
        document.body.classList.add('scroll-locked');
        document.addEventListener('touchmove', blockScroll, {
            passive: false
        });
        document.addEventListener('wheel', blockScroll, {
            passive: false
        });
        window.scrollTo(0, 0);
    }

    function unlockScroll() {
        if (!scrollLocked) return;
        scrollLocked = false;
        document.documentElement.classList.remove('scroll-locked');
        document.body.classList.remove('scroll-locked');
        document.removeEventListener('touchmove', blockScroll);
        document.removeEventListener('wheel', blockScroll);
    }

    // 配置注入
    function applyConfig() {
        if (!cfg) return;

        const navIcon = document.getElementById('navIcon');
        const dlIcon = document.getElementById('dlIcon');
        if (navIcon) navIcon.src = cfg.iconPath || navIcon.src;
        if (dlIcon) dlIcon.src = cfg.iconPath || dlIcon.src;

        const v = document.getElementById('versionDisplay');
        if (v && cfg.version) v.textContent = cfg.version;

        if (cfg.apkPath) {
            document.querySelectorAll('a[download]').forEach(a => {
                const href = a.getAttribute('href');
                if (href && href.endsWith('.apk')) a.href = cfg.apkPath;
            });
        }
    }

    // 导航 + 进度条
    function initScrollUI() {
        const bar = document.getElementById('progressBar');
        const nav = document.getElementById('nav');
        let ticking = false;

        function onScroll() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const scrollTop = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
                if (bar) bar.style.width = pct + '%';
                if (nav) nav.classList.toggle('nav-scrolled', scrollTop > 80);
                ticking = false;
            });
        }

        window.addEventListener('scroll', onScroll, {
            passive: true
        });
        onScroll();
    }

    // 打字机
    let typewriterPlayed = false;

    function playTypewriter() {
        if (typewriterPlayed) return;
        typewriterPlayed = true;

        const lines = document.querySelectorAll('#quoteText .q-line');
        const attrib = document.getElementById('quoteAttrib');
        if (!lines.length) return;

        let lineIdx = 0;

        function playLine() {
            if (lineIdx >= lines.length) {
                if (attrib) attrib.classList.add('visible');
                return;
            }

            const line = lines[lineIdx];
            const text = line.getAttribute('data-text') || '';
            const isEm = line.hasAttribute('data-em');
            let charIdx = 0;

            line.textContent = '';

            const caret = document.createElement('span');
            caret.className = 'caret';
            line.appendChild(caret);

            let target;
            if (isEm) {
                target = document.createElement('em');
                line.insertBefore(target, caret);
            } else {
                target = document.createTextNode('');
                line.insertBefore(target, caret);
            }

            function nextChar() {
                if (charIdx >= text.length) {
                    caret.remove();
                    lineIdx++;
                    setTimeout(playLine, 260);
                    return;
                }

                const ch = text[charIdx];
                if (isEm) target.textContent += ch;
                else target.textContent += ch;

                if (ch.trim() !== '' && window.GlyphAudio) {
                    window.GlyphAudio.playWrite();
                }

                charIdx++;
                const delay = /[，。！？、；：]/.test(ch) ?
                    240 :
                    (45 + Math.random() * 45);
                setTimeout(nextChar, delay);
            }

            nextChar();
        }

        playLine();
    }

    // 流星
    function flyMeteor() {
        const meteor = document.getElementById('meteor');
        const titleEl = document.querySelector('.hero-title-cn');
        if (!meteor || !titleEl || REDUCED) return;

        const rect = titleEl.getBoundingClientRect();
        // 标题已经滚出视口时直接跳过，避免陨石飞到看不见的位置
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;

        const W = meteor.offsetWidth || 420;
        const H = meteor.offsetHeight || 2;

        const headStartX = window.innerWidth + 40;
        const headStartY = -40;
        const headEndX = rect.left;
        const headEndY = rect.bottom;

        const startX = headStartX - W;
        const startY = headStartY - H / 2;
        const endX = headEndX - W;
        const endY = headEndY - H / 2;

        const angleDeg =
            (Math.atan2(headEndY - headStartY, headEndX - headStartX) * 180) / Math.PI;

        meteor.style.transformOrigin = 'right center';

        if (!meteor.animate) return;

        meteor.animate(
            [{
                    transform: `translate(${startX}px, ${startY}px) rotate(${angleDeg}deg)`,
                    opacity: 0
                },
                {
                    transform: `translate(${startX + (endX - startX) * 0.06}px, ${startY + (endY - startY) * 0.06}px) rotate(${angleDeg}deg)`,
                    opacity: 1,
                    offset: 0.12
                },
                {
                    transform: `translate(${startX + (endX - startX) * 0.85}px, ${startY + (endY - startY) * 0.85}px) rotate(${angleDeg}deg)`,
                    opacity: 1,
                    offset: 0.82
                },
                {
                    transform: `translate(${endX}px, ${endY}px) rotate(${angleDeg}deg)`,
                    opacity: 0
                }
            ], {
                duration: 1500,
                easing: 'cubic-bezier(0.4, 0, 0.6, 1)',
                fill: 'forwards'
            }
        );
    }

    // 章节入场观察器
    function observeReveal(selector, options, onVisible) {
        const nodes = document.querySelectorAll(selector);
        if (!nodes.length) return;

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (!e.isIntersecting) return;
                onVisible(e.target);
                obs.unobserve(e.target);
            });
        }, options);

        nodes.forEach(el => obs.observe(el));
    }

    function initObservers() {
        // 章节标题
        observeReveal(
            '.chapter-mark, .chapter-title, .chapter-sub', {
                threshold: 0.3,
                rootMargin: '0px 0px -60px 0px'
            },
            el => el.classList.add('visible')
        );

        // 引擎条目
        observeReveal(
            '.engine-item', {
                threshold: 0.15,
                rootMargin: '0px 0px -60px 0px'
            },
            el => el.classList.add('visible')
        );

        // Feature 格子
        observeReveal(
            '.feature-cell', {
                threshold: 0.15,
                rootMargin: '0px 0px -60px 0px'
            },
            el => el.classList.add('visible')
        );

        // Flow 卡片（错峰入场）
        (function() {
            const cards = document.querySelectorAll('.flow-card');
            if (!cards.length) return;
            const obs = new IntersectionObserver((entries) => {
                entries.forEach((e, i) => {
                    if (!e.isIntersecting) return;
                    const el = e.target;
                    setTimeout(() => el.classList.add('visible'), i * 80);
                    obs.unobserve(el);
                });
            }, {
                threshold: 0.1
            });
            cards.forEach(el => obs.observe(el));
        })();

        // 引言打字机
        (function() {
            const qt = document.getElementById('quoteText');
            if (!qt) return;
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (!e.isIntersecting) return;
                    playTypewriter();
                    obs.unobserve(e.target);
                });
            }, {
                threshold: 0.35
            });
            obs.observe(qt);
        })();

        // Finale 整体光晕
        (function() {
            const finale = document.querySelector('.finale');
            if (!finale) return;
            const obs = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (!e.isIntersecting) return;
                    e.target.classList.add('visible');
                    obs.unobserve(e.target);
                });
            }, {
                threshold: 0.2
            });
            obs.observe(finale);
        })();

        // Finale 子元素
        observeReveal(
            '#finaleMark, #finaleIcon, #finaleTitle, #finaleSub, #versionBadge, #finaleCtaWrap', {
                threshold: 0.3
            },
            el => el.classList.add('visible')
        );
    }

    // Flow 卡片激活态（滚动时同步高亮）
    function initFlowCards() {
        const track = document.getElementById('flowTrack');
        const cards = Array.from(document.querySelectorAll('.flow-card'));
        if (!track || !cards.length) return;

        const setActive = (card) => {
            cards.forEach(c => c.classList.toggle('active', c === card));
        };
        setActive(cards[0]);

        let raf = null;
        track.addEventListener('scroll', () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = null;
                const style = getComputedStyle(track);
                const padLeft = parseFloat(style.paddingLeft) || 0;
                const trackLeft = track.getBoundingClientRect().left + padLeft;

                let best = cards[0];
                let bestDist = Infinity;
                for (const c of cards) {
                    const r = c.getBoundingClientRect();
                    const d = Math.abs(r.left - trackLeft);
                    if (d < bestDist) {
                        bestDist = d;
                        best = c;
                    }
                }
                setActive(best);
            });
        }, {
            passive: true
        });
    }

    // 锚点平滑滚动
    function initAnchorScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(a => {
            a.addEventListener('click', function(e) {
                if (scrollLocked) {
                    e.preventDefault();
                    return;
                }
                const href = this.getAttribute('href');
                if (!href || href === '#') return;
                const target = document.querySelector(href);
                if (!target) return;
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            });
        });
    }

    // Boot 场景（Click to Start）
    function initBootScene() {
        const scene = document.getElementById('bootScene');
        const overture = document.getElementById('overture');

        // 没有 bootScene 时直接推进流程
        if (!scene) {
            revealOverture(overture);
            return;
        }

        let fired = false;

        const trigger = () => {
            if (fired) return;
            fired = true;

            scene.removeEventListener('click', trigger);
            scene.removeEventListener('touchend', trigger);
            scene.removeEventListener('keydown', keyHandler);

            // 同步调用 prime()
            let p = Promise.resolve(false);
            if (window.GlyphAudio) {
                p = window.GlyphAudio.prime();
            }

            // 视觉过渡与音频并行推进
            scene.classList.add('gone');
            setTimeout(() => scene.remove(), 900);

            // 音频 promise 无论成功/失败/超时，都要显示 overture
            p.then(() => revealOverture(overture), () => revealOverture(overture));
            setTimeout(() => revealOverture(overture), 400); // 兜底超时
        };

        const keyHandler = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                trigger();
            }
        };

        scene.addEventListener('click', trigger);
        scene.addEventListener('touchend', trigger, {
            passive: true
        });
        scene.addEventListener('keydown', keyHandler);
    }

    let _overtureShown = false;

    function revealOverture(overture) {
        if (_overtureShown) return;
        _overtureShown = true;

        if (!overture) {
            setTimeout(unlockScroll, 800);
            return;
        }

        // 移除 waiting class → 触发内部 span 的 CSS 入场动画
        overture.classList.remove('overture--waiting');

        // 显示 → 淡出 → 移除
        setTimeout(() => {
            overture.classList.add('gone');
            setTimeout(() => overture.remove(), 2000);
        }, 2200);

        // 解锁滚动
        setTimeout(unlockScroll, 3500);
    }

    // 启动
    function boot() {
        applyConfig();

        // 全程锁滚：进入主页面由 bootScene 触发
        lockScroll();

        // 星系
        if (window.GlyphGalaxy) {
            const svg = document.getElementById('galaxySvg');
            window.GlyphGalaxy.build(svg, {
                reducedMotion: REDUCED
            });
        }

        initScrollUI();
        initFlowCards();
        initObservers();
        initAnchorScroll();

        // 音频：只初始化，不播放
        if (window.GlyphAudio) {
            window.GlyphAudio.init();
            window.GlyphAudio.onMeteor = flyMeteor;
        }

        // 由启动页统一驱动
        initBootScene();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, {
            once: true
        });
    } else {
        boot();
    }
})();