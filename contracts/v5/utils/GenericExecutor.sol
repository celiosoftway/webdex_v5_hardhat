// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract GenericExecutor {
    function execute(address token, address to, uint256 amount) external {
        (bool ok, ) = token.call(
            abi.encodeWithSignature(
                "transfer(address,uint256)",
                to,
                amount
            )
        );
        require(ok, "transfer failed");
    }
}