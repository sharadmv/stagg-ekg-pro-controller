{
  description = "Development environment for coffee-tools";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      supportedSystems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forEachSupportedSystem =
        f:
        nixpkgs.lib.genAttrs supportedSystems (
          system:
          f {
            pkgs = import nixpkgs { inherit system; };
          }
        );
    in
    {
      devShells = forEachSupportedSystem (
        { pkgs }:
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              # Python environment
              python313
              python313Packages.pip
              python313Packages.virtualenv

              # Node.js environment
              nodejs
              nodePackages.npm
              nodePackages.typescript-language-server

              # Tooling
              pyright

              # Shells
              fish
              bashInteractive

              # Native dependencies for bleak (Bluetooth)
              bluez
              pkg-config
              dbus
            ];

            shellHook = ''
              # If we are in bash, print the message. 
              # If we are being loaded by direnv, this will still show up in the logs.
              echo -e "\033[1;34m☕ coffee-tools development environment loaded!\033[0m" >&2
              echo -e "\033[1;32mPython:\033[0m $(python --version)" >&2
              echo -e "\033[1;32mNode:\033[0m $(node --version)" >&2

              # Optional: automatically switch to fish if we are in an interactive bash shell
              # and weren't started with a specific command
              if [[ $- == *i* && $SHELL != *"fish"* ]]; then
                 # echo "Switching to fish..." >&2
                 # exec fish
                 true
              fi
            '';
          };
        }
      );
    };
}
