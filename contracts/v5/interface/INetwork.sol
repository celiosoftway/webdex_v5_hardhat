// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface INetwork {
    function getBalance(
        address contractAddress,
        address token,
        address user
    ) external view returns (uint256);

    function withdraw(address user, address token, uint256 amount) external;
    function payFee(
        address contractAddress,
        address user,
        address token,
        uint256 amount,
        string memory id) external;
}