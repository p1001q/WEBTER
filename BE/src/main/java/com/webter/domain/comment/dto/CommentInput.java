package com.webter.domain.comment.dto;

public record CommentInput(String text, Boolean anon, String parentId) {
}
