{
  inputs = {
    unstable.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = {
    unstable,
    flake-utils,
    ...
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import unstable {
        inherit system;
      };
    in {
      devShell = pkgs.mkShell {
        shellHook = ''
        '';
        packages = with pkgs; [
          nodejs
          python313Packages.huggingface-hub
          ruff
          uv
          shfmt
          ollama
          llama-cpp
        ];
      };
    });
}
