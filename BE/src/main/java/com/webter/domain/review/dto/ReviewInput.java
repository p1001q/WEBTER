package com.webter.domain.review.dto;

import com.webter.domain.review.entity.ReviewRating;

public record ReviewInput(ReviewRating rate, String text, Boolean anon) {
}
