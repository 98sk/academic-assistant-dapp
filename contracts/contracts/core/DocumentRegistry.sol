// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IRoleManagerForDocs {
    function hasRole(bytes32 role, address account) external view returns (bool);
    function ADMIN_ROLE() external view returns (bytes32);
    function PROFESSOR_ROLE() external view returns (bytes32);
    function STUDENT_ROLE() external view returns (bytes32);
}

/// @title DocumentRegistry
/// @notice Registry of document hashes + minimal metadata. No raw content on-chain.
contract DocumentRegistry {
    struct Document {
        bytes32 contentHash;
        string documentType;
        string targetGroup; // empty string => not group-targeted
        address uploader;
        uint64 timestamp;
        bool exists;
    }

    IRoleManagerForDocs public immutable roleManager;
    mapping(bytes32 => Document) private _documents;

    event DocumentRegistered(
        bytes32 indexed contentHash,
        address indexed uploader,
        string documentType,
        string targetGroup,
        uint256 timestamp
    );

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "DocumentRegistry: roleManager is zero");
        roleManager = IRoleManagerForDocs(roleManagerAddress);
    }

    /// @notice Register a document hash (once).
    /// @dev Authorization is intentionally simple: any recognized role may register.
    function registerDocument(
        bytes32 contentHash,
        string calldata documentType,
        string calldata targetGroup
    ) external {
        require(contentHash != bytes32(0), "DocumentRegistry: empty hash");
        require(bytes(documentType).length != 0, "DocumentRegistry: empty type");
        require(!_documents[contentHash].exists, "DocumentRegistry: already registered");
        require(_hasAnyAcademicRole(msg.sender), "DocumentRegistry: unauthorized");

        uint64 ts = uint64(block.timestamp);
        _documents[contentHash] = Document({
            contentHash: contentHash,
            documentType: documentType,
            targetGroup: targetGroup,
            uploader: msg.sender,
            timestamp: ts,
            exists: true
        });

        emit DocumentRegistered(contentHash, msg.sender, documentType, targetGroup, ts);
    }

    /// @notice Verify whether a document hash is registered.
    function verifyDocument(bytes32 contentHash) external view returns (bool) {
        return _documents[contentHash].exists;
    }

    /// @notice Read document fields without returning the struct.
    function getDocument(
        bytes32 contentHash
    )
        external
        view
        returns (
            string memory documentType,
            string memory targetGroup,
            address uploader,
            uint256 timestamp
        )
    {
        Document storage d = _documents[contentHash];
        require(d.exists, "DocumentRegistry: not found");
        return (d.documentType, d.targetGroup, d.uploader, d.timestamp);
    }

    function _hasAnyAcademicRole(address account) internal view returns (bool) {
        return
            roleManager.hasRole(roleManager.ADMIN_ROLE(), account) ||
            roleManager.hasRole(roleManager.PROFESSOR_ROLE(), account) ||
            roleManager.hasRole(roleManager.STUDENT_ROLE(), account);
    }
}

