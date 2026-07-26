#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import shlex
import sys
from urllib.parse import urlsplit


LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "::1"}
SHELL_OPERATORS = {"&", "(", ")", ";", "<", "<<", ">", ">>", "|", "||"}
UNSAFE_CURL_OPTIONS = {
    "--abstract-unix-socket",
    "--config",
    "--connect-to",
    "--cookie-jar",
    "--create-dirs",
    "--dump-header",
    "--location",
    "--location-trusted",
    "--output",
    "--output-dir",
    "--preproxy",
    "--proxy",
    "--remote-header-name",
    "--remote-name",
    "--remote-name-all",
    "--resolve",
    "--stderr",
    "--trace",
    "--trace-ascii",
    "--unix-socket",
    "-D",
    "-K",
    "-L",
    "-O",
    "-c",
    "-o",
    "-x",
}


def tokenize(command: str) -> list[list[str]] | None:
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars="|&;()<>")
        lexer.commenters = ""
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return None

    if not tokens or any(token in SHELL_OPERATORS for token in tokens):
        return None

    commands: list[list[str]] = [[]]
    for token in tokens:
        if token == "&&":
            if not commands[-1]:
                return None
            commands.append([])
            continue
        commands[-1].append(token)

    if not commands[-1]:
        return None
    return commands


def is_loopback_url(value: str) -> bool:
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        return False

    if parsed.scheme not in {"http", "https"}:
        return False
    if parsed.hostname not in LOOPBACK_HOSTS:
        return False
    if parsed.username is not None or parsed.password is not None:
        return False
    return port is None or 1 <= port <= 65535


def should_allow_curl(tokens: list[str]) -> bool:
    if not tokens or os.path.basename(tokens[0]) != "curl":
        return False

    if any(token in UNSAFE_CURL_OPTIONS for token in tokens[1:]):
        return False

    urls = [
        token
        for token in tokens[1:]
        if token.startswith("http://") or token.startswith("https://")
    ]
    return bool(urls) and all(is_loopback_url(url) for url in urls)


def should_allow(command: str) -> bool:
    commands = tokenize(command)
    return commands is not None and all(should_allow_curl(tokens) for tokens in commands)


def permission_response() -> dict[str, object]:
    return {
        "hookSpecificOutput": {
            "hookEventName": "PermissionRequest",
            "decision": {"behavior": "allow"},
        }
    }


def main() -> None:
    payload = json.load(sys.stdin)
    if payload.get("hook_event_name") != "PermissionRequest":
        return

    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return

    command = tool_input.get("command")
    if isinstance(command, str) and should_allow(command):
        json.dump(permission_response(), sys.stdout)


if __name__ == "__main__":
    main()
