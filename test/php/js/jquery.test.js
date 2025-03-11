(function ($) {
    function init($this) {
        $this.append("\
            <div style='padding-top: 5px;margin-bottom: 10px' class='questionTip'>\
                <label class='checkbox' style='display: inline-block'><input class='campaignCheckInput' type='checkbox' />${ebay_post_activ_promoted_listings}</label>\
                <i class='icon' rel='tooltip' data-original-title='${ebay_post_activ_promoted_listings_general_shot}' style='vertical-align: middle;margin-bottom:4px;margin-left:0;'></i>\
            </div>\
            <div class='promotedListingContext'style='display:none'>\
                <div class='campaignSelector' style='width:218px; margin-bottom: 10px'></div>\
                <span class='newCreate' style='margin-bottom: 10px'>\
                    <a href='javascript:;' class='newCampaign' style='font-size:12px'>+ ${ebay_post_queue_new}</a>\
                </span>\
                <div class='isFlatRate'>\
                    <div style='margin-bottom: 10px;' class='questionTip'>\
                        <input name='bidPercentage' class='input-mini number' type='text' AUTOCOMPLETE=\"off\">% &nbsp;&nbsp;&nbsp;\
                        <label class='checkbox' style='display: inline-block'>\
                            <input class='campaignBidRecommend' type='checkbox' style=\"margin-top:7px\"/>${ebay_post_advertising_apply_recommend}\
                            <select class=\"campaignBidRecommendType\" style=\"width:120px\">\
                            <option value=\"-1\">by item</option>\
                            <option value=\"0\">by trending</option>\
                            </select>\
                            <i class='icon' rel='tooltip' data-original-title='${ebay_campaign_recommend_tip}' style='vertical-align: middle;margin-bottom:4px'></i>\
                        </label>\
                    </div>\
                    <div class = 'bidPercentageError' style='color:red;font-size:12px'></div>\
                </div>\
                <div class='isDynamicRate' style='display: none; color: #999999; font-size: 12px;'>${ebay_post_bidding_strategy_dynamic_rate}</div>\
                <div class='noChooseTip' style='margin-top: 3px; margin-bottom: 5px'>${ebay_post_promoted_listing_tip2}</div>\
            </div>\
            <div style='margin-top: 10px; font-size: 12px;display: none' class='campaignProtocolTip'>\
                <spna style='color: red'>${ebay_promoted_listing_protocol_text1}</spna>\
                <a class='campaignProtocolTipa' href='javascript:;'>${ebay_promoted_listing_protocol_text2}</a>\
            </div>\
            <span class = \"expandAuthExpire\" style=\"display: none\">".juicer(i18n) + i18n.ebay_post_expand_auth_expire + "</span>\
        ".juicer(i18n));
        $this.append(`<div style='font-size: 12px;display:flex; flex-direction:column;' class='plaProtocolTip questionTip'>
                    <div>
                        <span class="noChooseTip">${i18n.ebay_post_activ_promoted_listings_desc}</span>
                        <i class='icon' rel='tooltip' data-original-title='${i18n.ebay_post_activ_promoted_listings_desc_tip}' style='vertical-align: middle;margin-bottom:4px'></i>
                    </div>
                    <a class='plaProtocolTipa' style="display:none" href='javascript:;'>
                        ${i18n.ebay_post_activ_promoted_listings_desc_tip}
                    </a>
                </div>`)
    }

})(jQuery);
