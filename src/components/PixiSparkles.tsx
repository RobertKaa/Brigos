import { useEffect, useRef } from "react";

export default function PixiSparkles({
  trigger,
  reducedMotion,
}: {
  trigger: number;
  reducedMotion: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const burst = useRef<(() => void) | null>(null);
  const latest = useRef(trigger);
  latest.current = trigger;
  useEffect(() => {
    const element = host.current;
    if (!element || reducedMotion) return;
    let disposed = false;
    let destroy: (() => void) | undefined;
    void (async () => {
      const { Application, Graphics } = await import("pixi.js");
      if (disposed) return;
      const app = new Application();
      try {
        await app.init({
          resizeTo: element,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(devicePixelRatio, 2),
          autoDensity: true,
          autoStart: false,
          preference: "webgl",
        });
      } catch {
        return;
      }
      destroy = () => app.destroy(true, { children: true });
      if (disposed) {
        destroy();
        return;
      }
      element.appendChild(app.canvas);
      const colors = [0xffc849, 0xef7165, 0x72b69e, 0x96a5e2, 0x75a6df];
      const particles = Array.from({ length: 56 }, (_, index) => {
        const graphic = new Graphics();
        if (index % 3 === 0)
          graphic.star(0, 0, 4, 7, 2.5).fill(colors[index % colors.length]);
        else
          graphic
            .roundRect(-4, -6, 8, 12, 2)
            .fill(colors[index % colors.length]);
        graphic.alpha = 0;
        app.stage.addChild(graphic);
        return { graphic, vx: 0, vy: 0, spin: 0 };
      });
      let elapsed = 0;
      app.ticker.add((ticker) => {
        const dt = Math.min(ticker.deltaMS / 16.67, 3);
        elapsed += ticker.deltaMS;
        for (const p of particles) {
          p.graphic.x += p.vx * dt;
          p.graphic.y += p.vy * dt;
          p.vy += 0.12 * dt;
          p.graphic.rotation += p.spin * dt;
          p.graphic.alpha = Math.max(0, 1 - elapsed / 1700);
        }
        if (elapsed > 1700) app.stop();
      });
      burst.current = () => {
        elapsed = 0;
        for (const p of particles) {
          const angle = -Math.PI + Math.random() * Math.PI;
          const speed = 3 + Math.random() * 7;
          p.graphic.position.set(
            app.screen.width / 2,
            app.screen.height * 0.48,
          );
          p.graphic.alpha = 1;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.spin = (Math.random() - 0.5) * 0.15;
        }
        app.start();
      };
      if (latest.current > 0) burst.current();
    })().catch(() => {
      /* Pack opening works without WebGL as well. */
    });
    return () => {
      disposed = true;
      burst.current = null;
      destroy?.();
    };
  }, [reducedMotion]);
  useEffect(() => {
    if (trigger > 0) burst.current?.();
  }, [trigger]);
  return <div className="pixi-sparkles" ref={host} aria-hidden="true" />;
}
