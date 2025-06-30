{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rssg.url = "github:tiny-bow/rssg";
  };

  outputs = { nixpkgs, rssg, ... }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in {
      packages.${system} = {
        default = pkgs.nodejs_22;
        node = pkgs.nodejs_22;
        rssg = rssg.packages.${system}.default;
      };

      apps.${system} = {
        node = {
          type = "app";
          program = "${pkgs.nodejs_22}/bin/node";
        };
        rssg = rssg.apps.${system}.default;
      };

      devShells.${system}.default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs_22
          pkgs.bashInteractive
          rssg.packages.${system}.default
        ];

        shellHook = ''
          echo "Node: $(node -v)"
          echo "NPM: $(npm -v)"
          echo "RSSG: ${rssg.version}"
          export PROMPT_NAME="dev:language-design@${pkgs.nodejs_22.version}"
        '';
      };
    };
}