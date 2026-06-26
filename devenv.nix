{ pkgs, ... }: {
  packages = with pkgs; [
    bun
    python3
    nodejs_23
    playwright-driver.browsers
  ];

  scripts = {
    build.exec = "bun build app.ts --outdir=.";
    test.exec = "vitest run";
    "test:e2e".exec = "playwright test";
    "test:all".exec = "vitest run && playwright test";
    serve.exec = "python3 -m http.server 3000";
    "ws-server".exec = "python3 server/ws_server.py";
  };

  enterShell = ''
    echo "Drawing App — dev environment"
    echo "  build     — bun build app.ts"
    echo "  test      — vitest run (unit)"
    echo "  test:e2e  — playwright test"
    echo "  test:all  — both"
    echo "  serve     — python3 http.server :3000"
    echo "  ws-server — python3 websocket :8001"
  '';

  languages.javascript = {
    enable = true;
    bun.enable = true;
  };
}
