// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/*
Exemplo de contrato de estratégia para vincular ao protocolo.
Não executa arbitragem real. Serve para testes de integração.
*/

import "@openzeppelin/contracts/access/Ownable.sol";

contract Conservadora is Ownable {
    struct Position {
        address user;
        address coin;
        uint256 amount;
        uint256 openedAt;
        bool active;
    }

    string public strategyName;
    bool public enabled = true;
    uint256 public totalPositions;

    mapping(uint256 => Position) public positions;

    event PositionOpened(
        uint256 indexed id,
        address indexed user,
        address indexed coin,
        uint256 amount
    );

    event PositionClosed(
        uint256 indexed id,
        address indexed user
    );

    event StrategyStatusChanged(bool enabled);

    constructor(string memory _name) {
        strategyName = _name;
    }

    function setEnabled(bool status) external onlyOwner {
        enabled = status;
        emit StrategyStatusChanged(status);
    }

    function openPosition(
        address user,
        address coin,
        uint256 amount
    ) external onlyOwner returns (uint256) {
        require(enabled, "Strategy disabled");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Invalid amount");

        totalPositions++;

        positions[totalPositions] = Position(
            user,
            coin,
            amount,
            block.timestamp,
            true
        );

        emit PositionOpened(totalPositions, user, coin, amount);

        return totalPositions;
    }

    function closePosition(uint256 id) external onlyOwner {
        require(positions[id].active, "Inactive");

        positions[id].active = false;

        emit PositionClosed(id, positions[id].user);
    }

    function getPosition(uint256 id) external view returns (Position memory) {
        return positions[id];
    }
}