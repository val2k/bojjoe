"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export default function ParallaxCarousel({
  slides = [
    { src: "/dts_dive_bar.jpg", alt: "Slide 1" },
    { src: "/dts_dive_bar2.jpg", alt: "Slide 2" },
    { src: "/dts_reform_franco.jpg", alt: "Slide 3" },
  ],
  height = 520,
  parallax = 0.18, // parallax pendant le drag
  snapDuration = 380, // ms
  threshold = 0.18, // % de la largeur pour changer de slide
  lockPx = 8, // px avant lock axe X/Y
  switchParallax = 0.22, // ✅ parallax marqué pendant le switch (en % de largeur)
  switchScaleFrom = 1.14, // ✅ scale au début du switch (entrant/sortant)
  switchScaleTo = 1.08, // scale repos
}) {
  const rootRef = useRef(null);
  const trackRef = useRef(null);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(index);
  useEffect(() => void (indexRef.current = index), [index]);

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  const stateRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
    width: 1,
    dragging: false,
    locked: null, // null | "x" | "y"
  });

  const ease = "cubic-bezier(.2,.8,.2,1)";

  const setTrackX = (x, animate = false) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate
      ? `transform ${snapDuration}ms ${ease}`
      : "none";
    track.style.transform = `translate3d(${x}px,0,0)`;
  };

  const setParallaxFromDx = (dx) => {
    const root = rootRef.current;
    if (!root) return;

    const w = stateRef.current.width || 1;
    const prog = dx / w;

    const slidesEls = root.querySelectorAll("[data-slide]");
    slidesEls.forEach((el) => {
      const i = Number(el.getAttribute("data-slide"));
      const img = el.querySelector("[data-img]");
      if (!img) return;

      const dist = i - indexRef.current;
      const x = -prog * w * parallax + dist * -18;

      img.style.transform = `translate3d(${x}px,0,0) scale(${switchScaleTo})`;
    });
  };

  const animateSwitch = (nextIdx, direction, w) => {
    const root = rootRef.current;
    if (!root) return;

    const currentIdx = indexRef.current;

    const currentSlide = root.querySelector(`[data-slide="${currentIdx}"]`);
    const nextSlide = root.querySelector(`[data-slide="${nextIdx}"]`);

    const currentImg = currentSlide?.querySelector("[data-img]");
    const nextImg = nextSlide?.querySelector("[data-img]");

    const travel = Math.round(w * switchParallax); // ✅ très marqué
    const outX = direction > 0 ? -travel : travel; // sortante
    const inX = direction > 0 ? travel : -travel; // entrante (opposé)

    // préparer image entrante (offset + scale)
    if (nextImg) {
      nextImg.style.transition = "none";
      nextImg.style.transform = `translate3d(${inX}px,0,0) scale(${switchScaleFrom})`;
    }

    // lancer anim au prochain frame
    requestAnimationFrame(() => {
      if (currentImg) {
        currentImg.style.transition = `transform ${snapDuration}ms ${ease}`;
        currentImg.style.transform = `translate3d(${outX}px,0,0) scale(${switchScaleFrom})`;
      }

      if (nextImg) {
        nextImg.style.transition = `transform ${snapDuration}ms ${ease}`;
        nextImg.style.transform = `translate3d(0px,0,0) scale(${switchScaleTo})`;
      }

      // reset propre
      window.setTimeout(() => {
        if (currentImg) {
          currentImg.style.transition = "none";
          currentImg.style.transform = `translate3d(0px,0,0) scale(${switchScaleTo})`;
        }
        if (nextImg) {
          nextImg.style.transition = "none";
          nextImg.style.transform = `translate3d(0px,0,0) scale(${switchScaleTo})`;
        }
      }, snapDuration + 30);
    });
  };

  const snapToIndex = (next, animate = true) => {
    const root = rootRef.current;
    if (!root) return;

    const w = root.getBoundingClientRect().width || 1;
    stateRef.current.width = w;

    const nextIdx = clamp(next, 0, slides.length - 1);
    const currentIdx = indexRef.current;

    if (nextIdx === currentIdx) {
      setTrackX(-currentIdx * w, animate);
      requestAnimationFrame(() => setParallaxFromDx(0));
      return;
    }

    const direction = nextIdx > currentIdx ? 1 : -1;

    // ✅ setIndex avant: la slide entrante existe déjà pour l'anim
    setIndex(nextIdx);

    setTrackX(-nextIdx * w, animate);

    // ✅ parallax marqué pendant le switch
    animateSwitch(nextIdx, direction, w);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ro = new ResizeObserver(() => {
      const w = root.getBoundingClientRect().width || 1;
      stateRef.current.width = w;
      setTrackX(-indexRef.current * w, false);
      setParallaxFromDx(0);
    });
    ro.observe(root);

    const w = root.getBoundingClientRect().width || 1;
    stateRef.current.width = w;
    setTrackX(-indexRef.current * w, false);
    setParallaxFromDx(0);

    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const root = rootRef.current;
    if (!root) return;

    const st = stateRef.current;
    st.pointerId = e.pointerId;
    st.startX = e.clientX;
    st.startY = e.clientY;
    st.dx = 0;
    st.dy = 0;
    st.dragging = false;
    st.locked = null;

    // ne pas capturer tout de suite
  };

  const onPointerMove = (e) => {
    const st = stateRef.current;
    if (st.pointerId !== e.pointerId) return;

    const root = rootRef.current;
    if (!root) return;

    st.dx = e.clientX - st.startX;
    st.dy = e.clientY - st.startY;

    if (st.locked == null) {
      const ax = Math.abs(st.dx);
      const ay = Math.abs(st.dy);
      if (ax < lockPx && ay < lockPx) return;

      st.locked = ax > ay ? "x" : "y";

      if (st.locked === "x") {
        st.dragging = true;
        root.setPointerCapture?.(e.pointerId);
        const track = trackRef.current;
        if (track) track.style.transition = "none";
      } else {
        st.dragging = false;
        return;
      }
    }

    if (!st.dragging) return;

    const w = st.width || root.getBoundingClientRect().width || 1;
    st.width = w;

    const atStart = indexRef.current === 0 && st.dx > 0;
    const atEnd = indexRef.current === slides.length - 1 && st.dx < 0;
    const resistedDx = atStart || atEnd ? st.dx * 0.35 : st.dx;

    setTrackX(-indexRef.current * w + resistedDx, false);
    setParallaxFromDx(resistedDx);
  };

  const endDrag = () => {
    const st = stateRef.current;
    const root = rootRef.current;
    if (!root) return;

    if (!st.dragging) {
      st.pointerId = null;
      st.locked = null;
      return;
    }

    const w = st.width || root.getBoundingClientRect().width || 1;
    const dx = st.dx;

    const absProg = Math.abs(dx) / w;
    let next = indexRef.current;

    if (absProg > threshold) next = dx < 0 ? next + 1 : next - 1;

    st.dragging = false;
    st.pointerId = null;
    st.locked = null;

    snapToIndex(next, true);
  };

  const onPointerUp = (e) => {
    const st = stateRef.current;
    if (st.pointerId !== e.pointerId) return;
    endDrag();
  };

  const onPointerCancel = (e) => {
    const st = stateRef.current;
    if (st.pointerId !== e.pointerId) return;
    endDrag();
  };

  const rootStyle = useMemo(
    () => ({
      height,
      touchAction: "pan-y pinch-zoom",
    }),
    [height],
  );

  return (
    <section
      ref={rootRef}
      className="relative w-full overflow-hidden rounded-md bg-black/20 select-none"
      style={rootStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      aria-roledescription="carousel"
    >
      <div
        ref={trackRef}
        className="absolute inset-0 flex will-change-transform"
      >
        {slides.map((s, i) => (
          <article
            key={i}
            data-slide={i}
            className="relative h-full w-full flex-shrink-0 overflow-hidden"
            aria-hidden={i !== index}
          >
            <div
              data-img
              className="absolute inset-0 will-change-transform"
              style={{
                backgroundImage: `url(${s.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: `translate3d(0,0,0) scale(${switchScaleTo})`,
              }}
              role="img"
              aria-label={s.alt}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          </article>
        ))}
      </div>

      <div className="absolute bottom-4 right-4 flex gap-2">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => snapToIndex(i, true)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === index ? "bg-white" : "bg-white/35 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
