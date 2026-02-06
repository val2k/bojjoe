"use client";
import React, { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(ScrollTrigger, Observer);

export default function HorizontalSnap() {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const root = rootRef.current;
      if (!root) return;

      const track = root.querySelector(".js-track");
      const panels = gsap.utils.toArray(".js-panel", root);

      let index = 0;
      let activeTl = null;

      const state = {
        animating: false,
        locked: false,
        lockTimer: null,
      };

      // layout
      gsap.set(track, {
        display: "flex",
        xPercent: 0,
        willChange: "transform",
      });
      gsap.set(panels, { flex: "0 0 100vw" });

      // pin (garde si tu veux l'effet "section verrouillée")
      const st = ScrollTrigger.create({
        trigger: root.querySelector(".js-horizontal"),
        start: "top top",
        end: () => `+=${(panels.length - 1) * window.innerWidth}`,
        pin: true,
        anticipatePin: 1,
      });

      const unlockSoon = () => {
        clearTimeout(state.lockTimer);
        state.lockTimer = setTimeout(() => {
          state.locked = false;
        }, 180);
      };

      const clampIndex = (i) => gsap.utils.clamp(0, panels.length - 1, i);

      const getItems = (panel) =>
        panel ? Array.from(panel.querySelectorAll(".js-parallax")) : [];

      // init parallax metadata
      panels.forEach((p) => {
        getItems(p).forEach((el) => {
          const depth = parseFloat(el.dataset.depth || "0.8"); // 0.2..1.6
          const sign = parseFloat(el.dataset.sign || "1"); // 1 ou -1
          el._parallax = { depth, sign };
          gsap.set(el, { x: 0, y: 0, rotate: 0, autoAlpha: 1 });
        });
      });

      const transition = ({ from, to, dir }) => {
        const fromPanel = panels[from];
        const toPanel = panels[to];
        const fromItems = getItems(fromPanel);
        const toItems = getItems(toPanel);

        activeTl?.kill();
        gsap.killTweensOf(track);

        const BASE = 160; // augmente si tu veux un parallax plus marqué

        const tl = gsap.timeline({
          onComplete: () => {
            state.animating = false;
            unlockSoon();
          },
        });

        // slide principal
        tl.to(
          track,
          {
            xPercent: -100 * to,
            duration: 0.8,
            ease: "power3.inOut",
          },
          0,
        );

        // parallax sortie: dérive dans le sens inverse du slide
        fromItems.forEach((el) => {
          const { depth, sign } = el._parallax;
          tl.to(
            el,
            {
              x: -dir * sign * BASE * depth * 0.5,
              y: 8 * depth,
              duration: 0.8,
              ease: "power3.inOut",
            },
            0,
          );
        });

        // parallax entrée: démarre décalé puis revient
        toItems.forEach((el) => {
          const { depth, sign } = el._parallax;
          gsap.set(el, { x: dir * sign * BASE * depth, y: 10 * depth });
          tl.to(
            el,
            {
              x: 0,
              y: 0,
              duration: 0.8,
              ease: "power3.inOut",
            },
            0,
          );
        });

        activeTl = tl;
      };

      const goTo = (i) => {
        const next = clampIndex(i);
        if (next === index) return;

        const from = index;
        const to = next;
        const dir = to > from ? +1 : -1;

        state.animating = true;
        state.locked = true;
        index = to;

        transition({ from, to, dir });
      };

      const step = (dir) => {
        if (state.animating || state.locked) return;
        goTo(index + dir);
      };

      const obs = Observer.create({
        target: window,
        type: "wheel,touch,pointer",
        tolerance: 30,
        preventDefault: true,
        onDown: () => step(-1),
        onUp: () => step(+1),
        onPress: () => {
          state.locked = true;
          clearTimeout(state.lockTimer);
        },
        onRelease: () => {
          if (!state.animating) unlockSoon();
        },
      });

      const onKey = (e) => {
        if (e.key === "ArrowRight") step(+1);
        if (e.key === "ArrowLeft") step(-1);
      };
      window.addEventListener("keydown", onKey);

      // reset first panel items
      gsap.set(getItems(panels[0]), { x: 0, y: 0 });

      return () => {
        window.removeEventListener("keydown", onKey);
        obs.kill();
        st?.kill();
        clearTimeout(state.lockTimer);
        activeTl?.kill();
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    // ✅ pas d'overflow-hidden ici (tu voulais que ça puisse chevaucher)
    <section ref={rootRef} className="js-horizontal h-lvh relative bg-white">
      {/* ✅ pas d'overflow-hidden ici non plus */}
      <div className="js-track relative will-change-transform">
        <div className="js-panel h-lvh relative">
          {/* Blocs colorés (peuvent dépasser et chevaucher) */}
          <div
            className="js-parallax absolute rounded-3xl bg-emerald-400/70"
            data-depth="0.25"
            data-sign="1"
            style={{ left: "6%", top: "14%", width: 220, height: 140 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-fuchsia-500/60"
            data-depth="1.1"
            data-sign="-1"
            style={{ left: "42%", top: "10%", width: 360, height: 220 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-sky-400/65"
            data-depth="1.5"
            data-sign="1"
            style={{ left: "72%", top: "52%", width: 260, height: 260 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-amber-400/60"
            data-depth="0.8"
            data-sign="-1"
            style={{ left: "18%", top: "64%", width: 520, height: 180 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-black/10"
            data-depth="1.3"
            data-sign="1"
            style={{ left: "86%", top: "6%", width: 220, height: 420 }}
          />
        </div>

        <div className="js-panel h-lvh relative">
          <div
            className="js-parallax absolute rounded-3xl bg-violet-500/55"
            data-depth="0.35"
            data-sign="-1"
            style={{ left: "10%", top: "18%", width: 320, height: 200 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-lime-400/60"
            data-depth="1.25"
            data-sign="1"
            style={{ left: "58%", top: "12%", width: 420, height: 240 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-rose-500/55"
            data-depth="1.55"
            data-sign="-1"
            style={{ left: "22%", top: "58%", width: 300, height: 300 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-cyan-400/60"
            data-depth="0.9"
            data-sign="1"
            style={{ left: "62%", top: "62%", width: 520, height: 190 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-black/10"
            data-depth="1.4"
            data-sign="-1"
            style={{ left: "-6%", top: "40%", width: 260, height: 260 }} // déborde à gauche
          />
        </div>

        <div className="js-panel h-lvh relative">
          <div
            className="js-parallax absolute rounded-3xl bg-orange-500/55"
            data-depth="0.3"
            data-sign="1"
            style={{ left: "12%", top: "12%", width: 260, height: 160 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-teal-400/60"
            data-depth="1.0"
            data-sign="-1"
            style={{ left: "50%", top: "18%", width: 520, height: 260 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-indigo-500/55"
            data-depth="1.6"
            data-sign="1"
            style={{ left: "18%", top: "62%", width: 440, height: 220 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-pink-500/55"
            data-depth="1.2"
            data-sign="-1"
            style={{ left: "78%", top: "56%", width: 240, height: 240 }}
          />
          <div
            className="js-parallax absolute rounded-3xl bg-black/10"
            data-depth="0.85"
            data-sign="1"
            style={{ left: "90%", top: "28%", width: 300, height: 300 }} // déborde à droite
          />
        </div>
      </div>
    </section>
  );
}
